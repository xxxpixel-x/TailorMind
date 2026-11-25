import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

// 只允许读取 public 下的集团案例与母版参考图，作为生图的结构约束。
async function loadBaseImage(raw: unknown): Promise<string | null> {
  const rel = typeof raw === "string" ? raw : "";
  const match = rel.match(/^\/(?:cases|generated)\/[\w\-/]+\.(jpe?g|png)$/i);
  if (!match || rel.includes("..")) return null;
  try {
    const buf = await readFile(path.join(process.cwd(), "public", rel));
    const mime = match[1].toLowerCase() === "png" ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function pickImageUrl(json: Record<string, unknown> & { data?: { url?: string; b64_json?: string }[]; images?: { url?: string }[]; imageUrl?: string }) {
  return (
    json?.imageUrl ||
    json?.data?.[0]?.url ||
    json?.images?.[0]?.url ||
    (json?.data?.[0]?.b64_json ? `data:image/png;base64,${json.data[0].b64_json}` : null)
  );
}

// 预留：自建 ComfyUI 等推理服务（风格 LoRA + ControlNet）。
// 约定 POST { prompt, negativePrompt, loraId, controlImage, controlType }，返回 { imageUrl }。
async function renderWithStyleService(params: { prompt: string; negativePrompt: string; baseImage: string | null }) {
  const url = (process.env.LIANGYI_STYLE_SERVICE_URL || "").trim();
  const res = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: params.prompt,
      negativePrompt: params.negativePrompt,
      loraId: process.env.LIANGYI_STYLE_LORA || "haipai-v1",
      controlImage: params.baseImage,
      controlType: process.env.LIANGYI_CONTROL_TYPE || "lineart",
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`风格生图服务返回 HTTP ${res.status}`);
  return pickImageUrl(await res.json());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").trim().slice(0, 1200);
    const negativePrompt = String(body.negativePrompt || "").trim().slice(0, 400);
    const customImageConfig = body.customImageConfig as
      | { baseUrl?: string; apiKey?: string; model?: string }
      | undefined;

    if (!prompt) {
      return NextResponse.json({ error: "缺少生图提示词" }, { status: 400 });
    }

    const userHasOwnKey = Boolean(
      customImageConfig?.apiKey && customImageConfig.apiKey.trim().length > 8
    );

    if (!userHasOwnKey) {
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : "local-ip";
      const rl = checkRateLimit(ip, "visualize");
      if (!rl.allowed) {
        return NextResponse.json({ error: rl.reason }, { status: 429 });
      }
    }

    const baseImage = await loadBaseImage(body.baseImagePath);

    if (process.env.LIANGYI_STYLE_SERVICE_URL?.trim()) {
      try {
        const imageUrl = await renderWithStyleService({ prompt, negativePrompt, baseImage });
        if (imageUrl) {
          return NextResponse.json({ ok: true, imageUrl, modelUsed: "风格 LoRA + ControlNet", constrained: Boolean(baseImage) });
        }
      } catch {
        // 自建服务不可用时回落到下方的通用生图接口。
      }
    }

    // 页面没填图像 Key 时回落到服务器配置，接口地址和模型也一并使用服务器的，与文本模型一致。
    const apiKey = (
      (userHasOwnKey && customImageConfig?.apiKey) || process.env.LIANGYI_IMAGE_API_KEY || ""
    ).trim();
    const baseUrl = (
      (userHasOwnKey && customImageConfig?.baseUrl) ||
      process.env.LIANGYI_IMAGE_BASE_URL ||
      "https://api.siliconflow.cn/v1"
    )
      .trim()
      .replace(/\/+$/, "");
    const model = (
      (userHasOwnKey && customImageConfig?.model) ||
      process.env.LIANGYI_IMAGE_MODEL ||
      "Kwai-Kolors/Kolors"
    ).trim();

    if (!apiKey) {
      return NextResponse.json({
        ok: false,
        needsKey: true,
        message:
          "当前使用集团案例实物图。可前往设置页填写图像模型配置，生成概念参考图。",
      });
    }

    const generate = (image: string | null) =>
      fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          image_size: "1024x768",
          num_inference_steps: 25,
          // 以母版参考图做图生图，让出图沿用可落地的版型结构。
          ...(image ? { image } : {}),
        }),
        signal: AbortSignal.timeout(45000),
      });

    let res = await generate(baseImage);
    let constrained = Boolean(baseImage);
    // 部分模型不支持图生图，去掉参考图再试一次。
    if (!res.ok && baseImage) {
      res = await generate(null);
      constrained = false;
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: `生图接口返回 HTTP ${res.status}，请核对图像模型配置。`,
        },
        { status: 502 }
      );
    }

    const imageUrl = pickImageUrl(await res.json());

    if (!imageUrl) {
      return NextResponse.json(
        { ok: false, message: "生图响应未包含有效图像 URL" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      imageUrl,
      modelUsed: model,
      constrained,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "实时生图请求失败，请检查图像模型配置。" }, { status: 500 });
  }
}
