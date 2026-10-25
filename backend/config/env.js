import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config({ path: new URL("../.env", import.meta.url) });

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
export const port = process.env.PORT || 3000;
export const neonAuthUrl = process.env.NEON_AUTH_URL;
export const cronSecret = process.env.CRON_SECRET;
