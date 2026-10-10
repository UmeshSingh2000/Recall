import "dotenv/config";
import prismaClient from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const { PrismaClient } = prismaClient;
const environment = process.env.ENVIRONMENT
const connectionString = environment === 'prod' ? process.env.DIRECT_URL ?? process.env.DATABASE_URL : process.env.DEV_DATABASE_URL;

if (!connectionString) {
    throw new Error("Set DATABASE_URL or DIRECT_URL in backend/.env");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;