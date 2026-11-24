export interface ClientModelSettings {
  llmBaseUrl: string;
  llmApiKey: string;
  llmModel: string;
  llmVerified?: boolean;
  imgBaseUrl: string;
  imgApiKey: string;
  imgModel: string;
}

export const LLM_PRESETS = [
  { name: "DeepSeek 官方", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  { name: "硅基流动", baseUrl: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3" },
  { name: "火山引擎豆包", baseUrl: "https://ark.cn-beijing.volces.com/api/v3", model: "doubao-1-5-pro-32k-250115" },
  { name: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
];

export const DEFAULT_MODEL_SETTINGS: ClientModelSettings = {
  llmBaseUrl: LLM_PRESETS[0].baseUrl, llmModel: LLM_PRESETS[0].model, llmApiKey: "",
  imgBaseUrl: "https://api.siliconflow.cn/v1", imgModel: "Kwai-Kolors/Kolors", imgApiKey: "",
};

export function textModelConfig(settings: ClientModelSettings) {
  return { baseUrl: settings.llmBaseUrl.trim(), model: settings.llmModel.trim(), apiKey: settings.llmApiKey.trim() };
}
