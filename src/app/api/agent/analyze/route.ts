import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  ConversationInputTurn,
  CustomLlmConfig,
  runLiangYiAgent,
} from "@/lib/agent-engine";
import { BusinessMode } from "@/lib/types";
import { describeReferenceImages } from "@/lib/vision";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: BusinessMode = body.mode === "uniform" ? "uniform" : "bespoke";
    const rawConv = Array.isArray(body.conversation) ? body.conversation : [];
    const fallbackInput = String(body.customerInput || "").trim();

    const conversation: ConversationInputTurn[] =
      rawConv.length > 0
        ? rawConv.slice(-12).map((m: Record<string, unknown>) => ({
            role: m.role === "agent" ? "agent" : "advisor",
            content: String(m.content || "").trim().slice(0, 1500),
          }))
        : fallbackInput
        ? [{ role: "advisor", content: fallbackInput.slice(0, 1500) }]
        : [];

    if (conversation.length === 0 || !conversation.some((m) => m.role === "advisor" && m.content)) {
      return NextResponse.json(
        { error: "请输入客户定制诉求或选择一个场景样例。" },
        { status: 400 }
      );
    }

    const customConfig = (body.customConfig || undefined) as CustomLlmConfig | undefined;
    const isUsingUserOwnKey = Boolean(
      customConfig?.apiKey && customConfig.apiKey.trim().length > 8
    );

    if (!isUsingUserOwnKey) {
      const forwarded = req.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0].trim() : "local-ip";
      const rl = checkRateLimit(ip, "analyze");
      if (!rl.allowed) {
        return NextResponse.json({ error: rl.reason }, { status: 429 });
      }
    }

    // 参考图：配置了视觉模型就先识别成一段文字并入原话，否则只计数，由追问兜底。
    const referenceImages = (Array.isArray(body.referenceImages) ? body.referenceImages : [])
      .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("data:image/"))
      .slice(0, 6);
    const referenceNote = await describeReferenceImages(referenceImages, customConfig);
    if (referenceNote) conversation.push({ role: "advisor", content: referenceNote });

    const result = await runLiangYiAgent({
      mode,
      conversation,
      customConfig,
      referenceImageCount: Math.max(0, Math.min(6, Number(body.referenceImageCount) || 0)),
    });

    return NextResponse.json({
      ok: true,
      data: result.plan,
      advisorReply: result.advisorReply,
      referenceNote,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "衣语引擎服务异常";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
