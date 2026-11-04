const parseModelList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  localAdminUsername: process.env.LOCAL_ADMIN_USERNAME ?? "Admin",
  localAdminPassword: process.env.LOCAL_ADMIN_PASSWORD ?? process.env.TEST_ADMIN_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  llmBaseUrl: (process.env.LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, ""),
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmTextModel: process.env.LLM_TEXT_MODEL ?? "gemini-3.8-flash",
  llmVisionModel: process.env.LLM_VISION_MODEL ?? "gemini-3.8-flash",
  llmTextFallbackModels: parseModelList(process.env.LLM_TEXT_FALLBACK_MODELS),
  llmVisionFallbackModels: parseModelList(process.env.LLM_VISION_FALLBACK_MODELS),
  chatRateLimitWindowMs: Math.max(1_000, Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? 60_000) || 60_000),
  chatRateLimitMaxRequests: Math.max(1, Number(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS ?? 10) || 10),
  chatMaxConcurrentPerIp: Math.max(1, Number(process.env.CHAT_MAX_CONCURRENT_PER_IP ?? 1) || 1),
  chatMaxConcurrentGlobal: Math.max(1, Number(process.env.CHAT_MAX_CONCURRENT_GLOBAL ?? 4) || 4),
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
};
