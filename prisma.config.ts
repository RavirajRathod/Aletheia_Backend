import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const isLocal = process.env.USE_LOCAL_DB === "true";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: isLocal ? env("LOCAL_DATABASE_URL") : env("DATABASE_URL"),
  },
});
