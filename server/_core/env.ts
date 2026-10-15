export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  localAdminUsername: process.env.LOCAL_ADMIN_USERNAME ?? "Admin",
  localAdminPassword: process.env.LOCAL_ADMIN_PASSWORD ?? process.env.TEST_ADMIN_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production",
  llmBaseUrl: (process.env.LLM_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/+$/, ""),
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmTextModel: process.env.LLM_TEXT_MODEL ?? "gemini-2.5-flash",
  llmVisionModel: process.env.LLM_VISION_MODEL ?? "gemini-2.5-flash",
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
};
