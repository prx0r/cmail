// verifiers.ts — Rebuilt with QP Actuality semantics + #3 fix (response_payload)
// Now delegates to qp/judges.ts for actual evaluation.

import { createHash } from "crypto";
import type { Actuality } from "../qp/kernel";
import { judgeDnsValid, judgeCfZoneActive, judgeEmailInfrastructure, judgeHandleAvailable, judgeAccountCreated, judgeOAuthAuthorized } from "../qp/judges";
import type { Evidence, JudgeResult } from "../qp/kernel";

export type { Actuality } from "../qp/kernel";

export interface VerifyResult {
  actuality: Actuality;
  reason?: string;
  evidence_hash: string;
}

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// Helper: create evidence with both response_payload and response_hash
function makeEvidence(overrides: Partial<Evidence> & { response_content: string }): Evidence {
  const content = overrides.response_content;
  return {
    id: "ev:" + sha256(content + Math.random()),
    class: "dns_answer",
    claim_id: "",
    observed_at: new Date().toISOString(),
    source: "unknown",
    locator: "",
    collector_id: "verifier",
    collector_program_hash: sha256("verifier"),
    collector_runtime_hash: "node:20",
    response_payload: content,
    response_hash: sha256(content),
    normalized_payload_hash: sha256(content),
    independence_group: "default",
    ...overrides,
  } as Evidence;
}

// ─── have_domain ───────────────────────────────────────────
export function verifyDomain(evidence: string): VerifyResult {
  const ev = makeEvidence({
    response_content: evidence,
    class: "dns_answer",
    source: "cloudflare-dns.com",
    locator: "dns:domain/MX",
    collector_id: "verify-capacity.sh",
    independence_group: "dns",
  });
  const result = judgeDnsValid([ev]);
  return { actuality: result.actuality, reason: result.reasons.join(", "), evidence_hash: sha256(evidence) };
}

// ─── receive_email ─────────────────────────────────────────
export interface EmailEvidence {
  mx_records: string[];
  spf_record: string;
  dmarc_record?: string;
  zone_id: string;
  zone_status: string;
  routing_rules: number;
  catch_all: boolean;
  worker_live: boolean;
  mailbox_indexed: boolean;
}

export function verifyReceiveEmail(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  let e: EmailEvidence;
  try { e = JSON.parse(evidence); } catch { return { actuality: "UNKNOWN", reason: "invalid JSON", evidence_hash: hash }; }

  const evidenceItems: Evidence[] = [
    makeEvidence({
      response_content: (e.mx_records || []).join(" ") + " " + (e.spf_record || ""),
      class: "dns_answer",
      source: "dns",
      locator: "dns:domain/MX",
      collector_id: "verify",
      independence_group: "email-infra",
    }),
    makeEvidence({
      response_content: e.zone_status || "unknown",
      class: "api_response",
      source: "cloudflare",
      locator: "cf:zone/" + e.zone_id,
      collector_id: "cf-api",
      independence_group: "email-infra",
    }),
    makeEvidence({
      response_content: e.worker_live ? "needs_me" : "unreachable",
      class: "worker_stats",
      source: "cmail-worker",
      locator: "https://cmail.tradesprior.workers.dev/api/stats",
      collector_id: "curl",
      independence_group: "email-infra",
    }),
  ];

  const judgeResult = judgeEmailInfrastructure(evidenceItems);
  return { actuality: judgeResult.actuality, reason: judgeResult.reasons.join(", "), evidence_hash: hash };
}

// ─── have_handle ───────────────────────────────────────────
export function verifyHandle(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  let e: { platform: string; status: string };
  try { e = JSON.parse(evidence); } catch { return { actuality: "UNKNOWN", reason: "invalid JSON", evidence_hash: hash }; }

  const ev = makeEvidence({
    response_content: evidence,
    class: "handle_check",
    source: e.platform,
    locator: `${e.platform}:handle`,
    collector_id: "apify",
    collector_program_hash: sha256("apify"),
    independence_group: "handle",
  });

  const result = judgeHandleAvailable([ev]);
  return { actuality: result.actuality, reason: result.reasons.join(", "), evidence_hash: hash };
}

// ─── have_phone ────────────────────────────────────────────
export function verifyPhone(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  try {
    const e = JSON.parse(evidence);
    if (e.number && e.number.startsWith("+")) {
      return { actuality: "TRUE", reason: "valid phone number", evidence_hash: hash };
    }
    return { actuality: "FALSE", reason: "no valid phone", evidence_hash: hash };
  } catch {
    return { actuality: "UNKNOWN", reason: "invalid JSON", evidence_hash: hash };
  }
}

// ─── have_cloudflare_zone ──────────────────────────────────
export function verifyCFZone(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  const ev = makeEvidence({
    response_content: evidence,
    class: "api_response",
    source: "cloudflare",
    locator: "cf:zone",
    collector_id: "cf-api",
    independence_group: "zone",
  });
  const result = judgeCfZoneActive([ev]);
  return { actuality: result.actuality, reason: result.reasons.join(", "), evidence_hash: hash };
}

// ─── can_send_email ────────────────────────────────────────
export function verifySendEmail(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  try {
    const e = JSON.parse(evidence);
    if (e.message_id && (!e.delivery_status || e.delivery_status !== "failed")) {
      return { actuality: "TRUE", reason: "send confirmed", evidence_hash: hash };
    }
    return { actuality: "FALSE", reason: "send not confirmed", evidence_hash: hash };
  } catch {
    return { actuality: "UNKNOWN", reason: "invalid JSON", evidence_hash: hash };
  }
}

// ─── Verifier dispatch ─────────────────────────────────────
export type CapacityType =
  | "have_domain"
  | "receive_email"
  | "have_handle"
  | "have_phone"
  | "have_cloudflare_zone"
  | "can_send_email";

const VERIFIERS: Record<CapacityType, (evidence: string) => VerifyResult> = {
  have_domain: verifyDomain,
  receive_email: verifyReceiveEmail,
  have_handle: verifyHandle,
  have_phone: verifyPhone,
  have_cloudflare_zone: verifyCFZone,
  can_send_email: verifySendEmail,
};

export function verify(type: CapacityType, evidence: string): VerifyResult {
  const fn = VERIFIERS[type];
  if (!fn) return { actuality: "UNKNOWN", reason: `unknown capacity type: ${type}`, evidence_hash: sha256(evidence) };
  return fn(evidence);
}
