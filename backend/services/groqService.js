import { groq } from "../config/env.js";

export async function generateWithGroq(messages) {
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages,
    temperature: 0.2,
  });

  return completion.choices[0]?.message?.content ?? "";
}
