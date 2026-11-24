import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").trim().slice(0, 1200);
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

    const res = await fetch(`${baseUrl}/images/generations`, {
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
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: `生图接口返回 HTTP ${res.status}，请核对图像模型配置。`,
        },
        { status: 502 }
      );
    }

    const json = await res.json();
    const imageUrl =
      json?.data?.[0]?.url ||
      json?.images?.[0]?.url ||
      (json?.data?.[0]?.b64_json
        ? `data:image/png;base64,${json.data[0].b64_json}`
        : null);

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
    });
  } catch {
    return NextResponse.json({ ok: false, message: "实时生图请求失败，请检查图像模型配置。" }, { status: 500 });
  }
}
