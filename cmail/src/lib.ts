import type { Env } from "./do";

// ---- permission policy: email content is UNTRUSTED input ----
// email → untrusted parser → classification → agent → policy → tool
const LEVELS = ["READ", "DRAFT", "SEND", "INTERNAL_ACTION", "EXTERNAL_ACTION", "FINANCIAL_ACTION", "ADMIN"] as const;

export function canDo(granted: string[], required: (typeof LEVELS)[number]): boolean {
  return granted.includes("ADMIN") || granted.includes(required);
}

export function routeAddress(to: string): { domain: string; localPart: string } {
  const at = to.toLowerCase().lastIndexOf("@");
  if (at < 0) return { domain: "unknown", localPart: to.toLowerCase() || "misc" };
  return { domain: to.toLowerCase().slice(at + 1) || "unknown", localPart: to.toLowerCase().slice(0, at) || "misc" };
}

export function threadId(subject: string): string {
  let s = subject.toLowerCase().trim();
  for (let i = 0; i < 5; i++) {
    const next = s.replace(/^(re|fwd?|aw|sv)\s*:\s*/i, "");
    if (next === s) break;
    s = next;
  }
  return s.slice(0, 80) || "misc";
}

export interface Classification {
  classification: string;
  importance: number; // 0-10 int
  needs_reply: 0 | 1;
  summary: string;
}

const KNOWN_CLASSES = new Set(["needs_reply", "receipt", "fyi", "urgent"]);

// AI output is untrusted: coerce to strict types so D1 binds and webhook
// thresholds never see garbage (e.g. needs_reply:"0" string is truthy!).
export function normalizeClassification(raw: any, fallbackSummary: string): Classification {
  const cls = String(raw?.classification ?? "fyi").toLowerCase();
  const importance = Math.max(0, Math.min(10, Math.round(Number(raw?.importance ?? 0) || 0)));
  const nr = raw?.needs_reply;
  const needs_reply = (nr === 1 || nr === true || String(nr).toLowerCase() === "true" || nr === "1") ? 1 : 0;
  const summary = String(raw?.summary ?? fallbackSummary ?? "").slice(0, 500);
  return {
    classification: KNOWN_CLASSES.has(cls) ? cls : "fyi",
    importance: needs_reply && importance === 0 ? 5 : importance,
    needs_reply,
    summary,
  };
}

export async function classify(env: Env, subject: string, snippet: string): Promise<Classification> {
  // Default heuristic; Workers AI upgrades when AI binding available.
  const text = `${subject} ${snippet}`.toLowerCase();
  const needs_reply = /help|support|issue|question|approve|accept|action required|invoice|order/.test(text) ? 1 : 0;
  const importance = /apple|developer|security|payment|order|urgent/.test(text) ? 8 : needs_reply ? 5 : 1;
  const classification = /receipt|invoice|notification|noreply/.test(text) ? "receipt" : needs_reply ? "needs_reply" : "fyi";
  const fallback = normalizeClassification({ classification, importance, needs_reply }, snippet.slice(0, 200));
  try {
    const r: any = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "Classify email. Reply JSON only: {classification,importance(0-10),needs_reply(0/1),summary}." },
        { role: "user", content: `Subject: ${subject}\nBody: ${snippet.slice(0, 1500)}` },
      ],
    });
    const m = String(r?.response ?? "").match(/\{[\s\S]*\}/);
    if (m) return normalizeClassification(JSON.parse(m[0]), fallback.summary);
  } catch { /* fall through to heuristic */ }
  return fallback;
}
