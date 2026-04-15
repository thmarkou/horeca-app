import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./platform/db/schema.ts",
  out: "./platform/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.PLATFORM_DATABASE_URL ?? "file:./data/platform.db",
  },
});
