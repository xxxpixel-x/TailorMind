// 参考图视觉解构（可选）。配置 LIANGYI_VISION_MODEL 后启用，未配置时由「参考图最喜欢哪一处」追问兜底。
// 接口为 OpenAI 兼容格式，可接通义 VL、豆包视觉、硅基流动 Qwen2.5-VL 等。

const PROMPT =
  "你是海派定制顾问。只描述图中服装可用于定制的要素：品类、领型、门襟与盘扣、袖型、廓形、颜色、面料质感、纹样工艺。" +
  "用一句中文短语列出，逗号分隔，不超过 60 字，不评价、不推测穿着者身份。";

export interface VisionConfig {
  baseUrl?: string;
  apiKey?: string;
}

// 返回形如「参考图识别：……」的一段文字，并入面谈原话后走同一套解构流程；失败时返回 null，不影响主流程。
export async function describeReferenceImages(images: string[], fallback?: VisionConfig): Promise<string | null> {
  const model = process.env.LIANGYI_VISION_MODEL?.trim();
  const apiKey = (process.env.LIANGYI_VISION_API_KEY || fallback?.apiKey || "").trim();
  const baseUrl = (process.env.LIANGYI_VISION_BASE_URL || fallback?.baseUrl || "").trim().replace(/\/+$/, "");
  if (!model || !apiKey || !baseUrl || images.length === 0) return null;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: [
            ...images.map((url) => ({ type: "image_url", image_url: { url } })),
            { type: "text", text: PROMPT },
          ],
        }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = String(json?.choices?.[0]?.message?.content || "").replace(/[\n；;]+/g, "，").trim().slice(0, 120);
    return text ? `参考图识别：${text}` : null;
  } catch {
    return null;
  }
}
