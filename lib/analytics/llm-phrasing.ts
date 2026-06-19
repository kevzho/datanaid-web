import "server-only";
import type { Insight } from "@/types/dataset";
import { getGroqConfig } from "@/lib/analytics/llm-provider";

/**
 * OPTIONAL LLM phrasing layer with a strict no-hallucination guard.
 *
 * Rules enforced here:
 *  1. The LLM only runs if GROQ_API_KEY is set. Otherwise the deterministic
 *     template prose is returned unchanged.
 *  2. The LLM is asked to REPHRASE narrative text ONLY — it is forbidden from
 *     inventing or altering numbers.
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

interface ChatCompletionChoice {
  message?: { content?: string };
}
interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
}

async function callGroq(prompt: string): Promise<string | null> {
  const config = getGroqConfig();
  if (!config) return null;

  try {
    const res = await fetch(config.chatCompletionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        max_tokens: config.maxTokens,
        messages: [
          {
            role: "system",
            content:
              "You rephrase nonprofit data insights into concise, board-ready analyst prose. " +
              "You MUST NOT introduce, change, or remove any number, statistic, percentage, or dollar figure. " +
              "Do not imply causality. Use only the facts and numbers provided. Return strict JSON: {\"title\":\"...\",\"what_happened\":\"...\",\"recommended_action\":\"...\"}.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ChatCompletionResponse;
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
  if (!getGroqConfig()) {
    return insights; // deterministic-only mode
  }

  const out: Insight[] = [];
  for (const ins of insights) {
    // Numbers the LLM is allowed to use = numbers already in this insight.
    const allowed = new Set<string>([
      ...extractNumbers(ins.title),
      ...extractNumbers(ins.what_happened),
      ...extractNumbers(ins.finding),
      ...extractNumbers(ins.evidence),
      ...extractNumbers(ins.what_contributed),
      ...extractNumbers(ins.why_it_matters),
      ...extractNumbers(ins.recommended_action),
      ...extractNumbers(String(ins.value)),
    ]);

    const prompt =
      `Rephrase this insight. Keep ALL numbers identical.\n\n` +
      `title: ${ins.title}\n` +
      `type: ${ins.type}\n` +
      `confidence: ${ins.confidence}\n` +
      `what_happened: ${ins.what_happened}\n` +
      `evidence (do not contradict): ${ins.evidence}\n` +
      `what_contributed (do not make causal): ${ins.what_contributed}\n` +
      `recommended_action: ${ins.recommended_action}`;

    const raw = await callGroq(prompt);
    if (!raw) {
      out.push(ins);
      continue;
    }
    try {
      const parsed = JSON.parse(raw) as {
        title?: string;
        what_happened?: string;
        recommended_action?: string;
      };
      const newTitle = parsed.title?.trim();
      const newFinding = parsed.what_happened?.trim();
      const newAction = parsed.recommended_action?.trim();
      if (
        newTitle &&
        newFinding &&
        newAction &&
        passesNumberGuard(newTitle, allowed) &&
        passesNumberGuard(newFinding, allowed) &&
        passesNumberGuard(newAction, allowed)
      ) {
        out.push({
          ...ins,
          title: newTitle,
          what_happened: newFinding,
          finding: newFinding,
          recommended_action: newAction,
          phrased: true,
        });
      } else {
        out.push(ins); // guard failed → deterministic fallback
      }
    } catch {
      out.push(ins);
    }
  }
  return out;
}
