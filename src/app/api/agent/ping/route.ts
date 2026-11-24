import { NextResponse } from "next/server";
import { requestModelText } from "@/lib/command-model";

export async function POST(request: Request) {
  const config = await request.json().catch(() => null);
  if (!config || [config.baseUrl, config.model, config.apiKey].some(v => typeof v !== "string")) {
    return NextResponse.json({ error: "请填写完整的文本模型配置。" }, { status: 400 });
  }
  try {
    await requestModelText(config, [{ role: "user", content: "回复好" }], true);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "连接测试失败。" }, { status: 400 });
  }
}
