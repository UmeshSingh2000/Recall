import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.ENVIRONMENT === "prod"
    ? process.env.DIRECT_URL ?? process.env.DATABASE_URL
    : process.env.DEV_DATABASE_URL;

if (!connectionString) {
  throw new Error("Database connection string is missing");
}

const adapter = new PrismaPg({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
});

const prisma = new PrismaClient({ adapter });

export default prisma;