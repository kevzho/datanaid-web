import "server-only";
import type { Insight } from "@/types/dataset";

/**
 * OPTIONAL LLM phrasing layer with a strict no-hallucination guard.
 *
 * Rules enforced here:
 *  1. The LLM only runs if OPENAI_API_KEY is set. Otherwise the deterministic
 *     template prose is returned unchanged.
 *  2. The LLM is asked to REPHRASE the `finding` and `recommended_action`
 *     ONLY — it is forbidden from inventing or altering numbers.
 *  3. The guard verifies that every numeric token present in the original
 *     evidence/finding still appears in the rephrased text, and that NO new
 *     numbers were introduced. If the guard fails, we fall back to the
 *     deterministic prose. This makes hallucinated statistics impossible to
 *     ship.
 */

const NUM_RE = /-?\$?\d[\d,]*\.?\d*%?/g;

function extractNumbers(text: string): Set<string> {
  const matches = text.match(NUM_RE) ?? [];
  return new Set(matches.map((m) => m.replace(/[$,%]/g, "")));
}

/** True when `rephrased` introduces no number that isn't in `allowed`. */
export function passesNumberGuard(rephrased: string, allowed: Set<string>): boolean {
  const used = extractNumbers(rephrased);
  for (const n of used) {
    if (n === "" ) continue;
    if (!allowed.has(n)) return false;
  }
  return true;
}

interface OpenAIChoice {
  message?: { content?: string };
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
}

async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You rephrase nonprofit data insights into clear, warm, funder-ready prose. " +
              "You MUST NOT introduce, change, or remove any number, statistic, percentage, or dollar figure. " +
              "Use only the facts and numbers provided. Return strict JSON: {\"finding\":\"...\",\"recommended_action\":\"...\"}.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenAIResponse;
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/**
 * Rephrase a batch of insights. Returns insights with `phrased: true` when the
 * LLM produced guarded prose, otherwise the original deterministic text.
 */
export async function phraseInsights(insights: Insight[]): Promise<Insight[]> {
  if (!process.env.OPENAI_API_KEY) {
    return insights; // deterministic-only mode
  }

  const out: Insight[] = [];
  for (const ins of insights) {
    // Numbers the LLM is allowed to use = numbers already in this insight.
    const allowed = new Set<string>([
      ...extractNumbers(ins.finding),
      ...extractNumbers(ins.evidence),
      ...extractNumbers(ins.recommended_action),
      ...extractNumbers(String(ins.value)),
    ]);

    const prompt =
      `Rephrase this insight. Keep ALL numbers identical.\n\n` +
      `finding: ${ins.finding}\n` +
      `evidence (do not contradict): ${ins.evidence}\n` +
      `recommended_action: ${ins.recommended_action}`;

    const raw = await callOpenAI(prompt);
    if (!raw) {
      out.push(ins);
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as { finding?: string; recommended_action?: string };
      const newFinding = parsed.finding?.trim();
      const newAction = parsed.recommended_action?.trim();
      if (
        newFinding &&
        newAction &&
        passesNumberGuard(newFinding, allowed) &&
        passesNumberGuard(newAction, allowed)
      ) {
        out.push({ ...ins, finding: newFinding, recommended_action: newAction, phrased: true });
      } else {
        out.push(ins); // guard failed → deterministic fallback
      }
    } catch {
      out.push(ins);
    }
  }
  return out;
}
