import type { CustomLlmConfig } from "@/lib/agent-engine";

// 接口错误只返回状态，不转发供应商的响应正文或含凭据的请求信息。
export async function requestModelText(config: CustomLlmConfig | undefined, messages: { role: string; content: string }[], ping = false) {
  const apiKey = config?.apiKey?.trim();
  const model = config?.model?.trim();
  if (!apiKey || !model) throw new Error("请填写模型和 API Key。");
  let url: URL;
  try { url = new URL(config?.baseUrl?.trim() || ""); }
  catch { throw new Error("接口地址格式有误。"); }
  if (url.username || url.password || url.search || url.hash || url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) {
    throw new Error("请填写 HTTPS 接口地址，本机模型也可使用本地 HTTP 地址。");
  }
  url.pathname = url.pathname.replace(/\/+$/, "") + "/chat/completions";
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", cache: "no-store", redirect: "error",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
      body: JSON.stringify({ model, messages, ...(ping ? { max_tokens: 1 } : { response_format: { type: "json_object" } }) }),
      signal: AbortSignal.timeout(ping ? 12000 : 25000) });
  } catch { throw new Error("未能连接模型接口，请检查地址或稍后重试。"); }
  if (!res.ok) throw new Error("模型接口返回 HTTP " + res.status + "，请核对接口地址、模型和 Key。");
  const data = await res.json().catch(() => null);
  const message = data?.choices?.[0]?.message;
  if (!message || (!ping && typeof message.content !== "string")) throw new Error("接口返回了无法识别的模型响应。");
  return String(message.content ?? "");
}
