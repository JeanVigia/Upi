export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  localAdminUsername: process.env.LOCAL_ADMIN_USERNAME ?? "Admin",
  localAdminPassword: process.env.LOCAL_ADMIN_PASSWORD ?? process.env.TEST_ADMIN_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  llmBaseUrl: (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmTextModel: process.env.LLM_TEXT_MODEL ?? "gpt-4o-mini",
  llmVisionModel: process.env.LLM_VISION_MODEL ?? "gpt-4o",
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
};
