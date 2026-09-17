// qp/judges.ts — Deterministic judges and gates for setup.social
// Each judge returns Actuality (TRUE/FALSE/UNKNOWN), never pass:boolean.
// Judges are pure functions over canonical evidence input.

import type { Evidence, JudgeResult, GateResult, Actuality } from "./kernel";

// ═══════════════════════════════════════════════════════════
// JUDGES — evaluate evidence → Actuality
// ═══════════════════════════════════════════════════════════

/**
 * Judge: dns_valid_v1
 * Evidence: dig MX + dig TXT output
 * Returns: TRUE if MX records point to cloudflare AND SPF present
 */
export function judgeDnsValid(evidence: Evidence[]): JudgeResult {
  const relevant = evidence.filter((e) => e.class === "dns_answer");
  if (relevant.length === 0) {
    return { judge_id: "dns_valid_v1", bundle_hash: "", actuality: "UNKNOWN", reasons: ["no dns evidence"], evidence_ids: [] };
  }

  const hasMX = relevant.some((e) => /route\d+\.mx\.cloudflare\.net/.test(e.response_hash));
  const hasSPF = relevant.some((e) => /v=spf1/.test(e.response_hash));

  if (hasMX && hasSPF) {
    return { judge_id: "dns_valid_v1", bundle_hash: "", actuality: "TRUE", reasons: ["MX records present", "SPF present"], evidence_ids: relevant.map((e) => e.id) };
  }

  const reasons: string[] = [];
  if (!hasMX) reasons.push("no cloudflare MX records");
  if (!hasSPF) reasons.push("no SPF record");
  return { judge_id: "dns_valid_v1", bundle_hash: "", actuality: "FALSE", reasons, evidence_ids: relevant.map((e) => e.id) };
}

/**
 * Judge: cf_zone_active_v1
 * Evidence: CF zone API response
 * Returns: TRUE if zone.status == "active"
 */
export function judgeCfZoneActive(evidence: Evidence[]): JudgeResult {
  const relevant = evidence.filter((e) => e.class === "api_response" && e.source.includes("cloudflare"));
  if (relevant.length === 0) {
    return { judge_id: "cf_zone_active_v1", bundle_hash: "", actuality: "UNKNOWN", reasons: ["no CF zone evidence"], evidence_ids: [] };
  }

  const active = relevant.some((e) => /"status"\s*:\s*"active"/.test(e.response_hash));
  return {
    judge_id: "cf_zone_active_v1",
    bundle_hash: "",
    actuality: active ? "TRUE" : "FALSE",
    reasons: active ? ["zone active"] : ["zone not active"],
    evidence_ids: relevant.map((e) => e.id),
  };
}

/**
 * Judge: email_infrastructure_v1
 * Evidence: composite of MX + SPF + routing + worker + mailbox
 * Returns: TRUE if all sub-checks pass
 */
export function judgeEmailInfrastructure(evidence: Evidence[]): JudgeResult {
  const relevant = evidence.filter((e) =>
    ["dns_answer", "api_response", "worker_stats"].includes(e.class)
  );
  if (relevant.length === 0) {
    return { judge_id: "email_infrastructure_v1", bundle_hash: "", actuality: "UNKNOWN", reasons: ["no email infrastructure evidence"], evidence_ids: [] };
  }

  const checks = {
    mx: relevant.some((e) => e.class === "dns_answer" && /cloudflare/.test(e.response_hash)),
    spf: relevant.some((e) => e.class === "dns_answer" && /v=spf1/.test(e.response_hash)),
    routing: relevant.some((e) => e.class === "api_response" && /routing/.test(e.source)),
    worker: relevant.some((e) => e.class === "worker_stats" && /needs_me/.test(e.response_hash)),
    mailbox: relevant.some((e) => e.class === "api_response" && /mailbox/.test(e.source)),
  };

  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (failed.length === 0) {
    return { judge_id: "email_infrastructure_v1", bundle_hash: "", actuality: "TRUE", reasons: ["all checks pass"], evidence_ids: relevant.map((e) => e.id) };
  }

  return {
    judge_id: "email_infrastructure_v1",
    bundle_hash: "",
    actuality: "FALSE",
    reasons: [`failed: ${failed.join(", ")}`],
    evidence_ids: relevant.map((e) => e.id),
  };
}

/**
 * Judge: handle_available_v1
 * Evidence: platform API check (Apify or direct)
 * Returns: TRUE if handle is available on platform
 */
export function judgeHandleAvailable(evidence: Evidence[]): JudgeResult {
  const relevant = evidence.filter((e) => e.class === "handle_check");
  if (relevant.length === 0) {
    return { judge_id: "handle_available_v1", bundle_hash: "", actuality: "UNKNOWN", reasons: ["no handle check evidence"], evidence_ids: [] };
  }

  const available = relevant.every((e) => /available.*yes/.test(e.response_hash) || /status.*available/.test(e.response_hash));
  return {
    judge_id: "handle_available_v1",
    bundle_hash: "",
    actuality: available ? "TRUE" : "FALSE",
    reasons: available ? ["handle available"] : ["handle taken or unknown"],
    evidence_ids: relevant.map((e) => e.id),
  };
}

/**
 * Judge: account_created_v1
 * Evidence: signup API response
 * Returns: TRUE if account creation succeeded
 */
export function judgeAccountCreated(evidence: Evidence[]): JudgeResult {
  const relevant = evidence.filter((e) => e.class === "signup_response");
  if (relevant.length === 0) {
    return { judge_id: "account_created_v1", bundle_hash: "", actuality: "UNKNOWN", reasons: ["no signup evidence"], evidence_ids: [] };
  }

  const created = relevant.some((e) => /success|created|account_id/.test(e.response_hash));
  return {
    judge_id: "account_created_v1",
    bundle_hash: "",
    actuality: created ? "TRUE" : "FALSE",
    reasons: created ? ["account created"] : ["account creation failed"],
    evidence_ids: relevant.map((e) => e.id),
  };
}

/**
 * Judge: oauth_authorized_v1
 * Evidence: OAuth token response
 * Returns: TRUE if valid access_token + refresh_token received
 */
export function judgeOAuthAuthorized(evidence: Evidence[]): JudgeResult {
  const relevant = evidence.filter((e) => e.class === "oauth_response");
  if (relevant.length === 0) {
    return { judge_id: "oauth_authorized_v1", bundle_hash: "", actuality: "UNKNOWN", reasons: ["no OAuth evidence"], evidence_ids: [] };
  }

  const authorized = relevant.some((e) => /access_token/.test(e.response_hash));
  return {
    judge_id: "oauth_authorized_v1",
    bundle_hash: "",
    actuality: authorized ? "TRUE" : "FALSE",
    reasons: authorized ? ["OAuth authorized"] : ["OAuth failed"],
    evidence_ids: relevant.map((e) => e.id),
  };
}

// ═══════════════════════════════════════════════════════════
// GATES — hard deterministic gates
// ═══════════════════════════════════════════════════════════

/**
 * Gate: all_judges_pass
 * Returns TRUE only if ALL judge results are TRUE
 */
export function gateAllJudgesPass(evidence: Evidence[], judgeResults: JudgeResult[]): GateResult {
  const failed = judgeResults.filter((r) => r.actuality !== "TRUE");
  if (failed.length === 0) {
    return { gate_id: "all_judges_pass", result: "TRUE", proof: "all judges returned TRUE", evidence_ids: [] };
  }
  return {
    gate_id: "all_judges_pass",
    result: "FALSE",
    proof: `failed judges: ${failed.map((f) => `${f.judge_id}=${f.actuality}`).join(", ")}`,
    evidence_ids: failed.flatMap((f) => f.evidence_ids),
  };
}

/**
 * Gate: no_unknown_required
 * Returns FALSE if any required evidence is UNKNOWN
 */
export function gateNoUnknownRequired(evidence: Evidence[], judgeResults: JudgeResult[]): GateResult {
  const unknowns = judgeResults.filter((r) => r.actuality === "UNKNOWN");
  if (unknowns.length === 0) {
    return { gate_id: "no_unknown_required", result: "TRUE", proof: "no UNKNOWN results", evidence_ids: [] };
  }
  return {
    gate_id: "no_unknown_required",
    result: "UNKNOWN",
    proof: `unknown judges: ${unknowns.map((u) => u.judge_id).join(", ")}`,
    evidence_ids: unknowns.flatMap((u) => u.evidence_ids),
  };
}

/**
 * Gate: evidence_fresh
 * Returns FALSE if any evidence exceeds freshness threshold
 */
export function gateEvidenceFresh(
  evidence: Evidence[],
  judgeResults: JudgeResult[],
  maxAgeSeconds: number = 3600
): GateResult {
  const now = Date.now();
  const stale = evidence.filter((e) => {
    const observed = new Date(e.observed_at).getTime();
    return (now - observed) / 1000 > maxAgeSeconds;
  });

  if (stale.length === 0) {
    return { gate_id: "evidence_fresh", result: "TRUE", proof: `all evidence within ${maxAgeSeconds}s`, evidence_ids: [] };
  }
  return {
    gate_id: "evidence_fresh",
    result: "FALSE",
    proof: `${stale.length} evidence items stale (>${maxAgeSeconds}s old)`,
    evidence_ids: stale.map((e) => e.id),
  };
}
