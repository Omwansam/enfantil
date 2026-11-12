// Prisma 7 configuration. The connection string comes from .env (DATABASE_URL).
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npm run db:seed` (or `npx prisma db seed`) loads the demo data for both apps.
    seed: "tsx prisma/seed.js",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
