import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool as PgPool } from "pg";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Required for Neon serverless in Node.js environment
neonConfig.webSocketConstructor = ws;

let prisma: PrismaClient;

// Check if we should use the local database instead of Neon
if (process.env.USE_LOCAL_DB === "true") {
  // Setup for Local PostgreSQL
  const connectionString = process.env.LOCAL_DATABASE_URL as string;
  const pool = new PgPool({ connectionString });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
  console.log("🗄️  Using Local PostgreSQL Database");
} else {
  // Setup for Neon Serverless PostgreSQL
  const connectionString = process.env.DATABASE_URL as string;
  // PrismaNeon now takes a PoolConfig object rather than a Pool instance directly
  const adapter = new PrismaNeon({ connectionString });
  prisma = new PrismaClient({ adapter });
  console.log("☁️  Using Neon Serverless Database");
}

export { prisma };
