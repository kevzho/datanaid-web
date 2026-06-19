import "server-only";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_CHAT_COMPLETIONS_URL = `${GROQ_BASE_URL}/chat/completions`;
export const GROQ_FAST_PHRASING_MODEL = "llama-3.1-8b-instant";
export const GROQ_DEEP_REASONING_MODEL = "llama-3.3-70b-versatile";
export const DEFAULT_GROQ_MODEL = GROQ_FAST_PHRASING_MODEL;
export const GROQ_PHRASING_MAX_TOKENS = 220;

export function getGroqConfig() {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: GROQ_BASE_URL,
    chatCompletionsUrl: GROQ_CHAT_COMPLETIONS_URL,
    model:
      process.env.GROQ_PHRASING_MODEL?.trim() ||
      process.env.GROQ_MODEL?.trim() ||
      DEFAULT_GROQ_MODEL,
    maxTokens: Number(process.env.GROQ_PHRASING_MAX_TOKENS ?? GROQ_PHRASING_MAX_TOKENS),
  };
}
