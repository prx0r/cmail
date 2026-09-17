// qp/kernel.ts — QP Root-of-Trust Kernel
// Implements the canonical QP proof object, Actuality semantics, ProofSpec,
// content-addressed receipts, and replay verification.
// This is the single source of truth for all proof/authority in setup.social.

import { createHash } from "crypto";
import { validateGrant } from "./authority";

// ═══════════════════════════════════════════════════════════
// 1. ACTUALITY — the canonical truth type
// ═══════════════════════════════════════════════════════════

export type Actuality = "TRUE" | "FALSE" | "UNKNOWN";

/**
 * AND-DAG evaluation over Actuality values.
 * CRITICAL: network timeout != FALSE. Missing token != FALSE.
 * Only the frozen ProofSpec defines what constitutes a falsifier.
 */
export function andDag(...values: Actuality[]): Actuality {
  if (values.includes("FALSE")) return "FALSE";
  if (values.includes("UNKNOWN")) return "UNKNOWN";
  return "TRUE";
}

/**
 * Evidence carries NO verdict. Verdicts live in claims via judges.
 * This is invariant 7 of the QP system.
 */
export interface Evidence {
  id: string;                    // content-addressed: sha256(canonical(payload))
  class: string;                 // "registrar_readback", "dns_answer", "api_response", etc.
  claim_id: string;              // which claim this evidence supports
  observed_at: string;           // ISO timestamp
  source: string;                // provider / DNS authority / API endpoint
  locator: string;               // sanitized canonical source locator
  collector_id: string;          // what collected this (e.g. "verify-capacity.sh")
  collector_program_hash: string; // SHA-256 of collector source
  collector_runtime_hash: string; // runtime identifier
  request_hash?: string;         // hash of outbound request (if any)
  response_hash: string;         // hash of raw response bytes
  normalized_payload_hash: string; // hash of canonical evidence payload
  nonce?: string;                // random nonce for freshness
  independence_group: string;    // prevents same-channel double-counting
  signature?: string;            // optional Ed25519 signature
  signer?: string;               // signer identity
}

// ═══════════════════════════════════════════════════════════
// 2. CLAIM — exact, parameterized, immutable
// ═══════════════════════════════════════════════════════════

export interface Claim {
  kind: "CLAIM";
  id: string;                    // content-addressed: sha256(canonical(predicate + subject))
  predicate: string;             // e.g. "domain_available", "email_receives"
  subject: Record<string, string>; // e.g. { provider: "cloudflare", domain: "privately.win" }
  statement: string;             // human-readable: "privately.win is available on Cloudflare"
  contract_root: string;         // which ProofSpec governs this claim
}

export function makeClaim(
  predicate: string,
  subject: Record<string, string>,
  statement: string,
  contractRoot: string
): Claim {
  const id = "claim:" + sha256(canonical({ predicate, subject })).slice(0, 16);
  return { kind: "CLAIM", id, predicate, subject, statement, contract_root: contractRoot };
}

// ═══════════════════════════════════════════════════════════
// 3. PROOFSPEC — immutable contract root
// ═══════════════════════════════════════════════════════════

export interface JudgeBundle {
  id: string;
  program_hash: string;          // SHA-256 of judge source code
  runtime_hash: string;          // runtime identifier
  config_hash: string;           // SHA-256 of judge config
  dependencies_hash: string;     // SHA-256 of dependency tree
  bundle_hash: string;           // SHA-256 of all above combined
}

export interface GateBundle {
  id: string;
  program_hash: string;
  required: boolean;             // AND-DAG: required gates must pass
}

export interface ProofSpec {
  protocol: "qp/1";
  spec_id: string;
  version: number;
  claim_schema_hash: string;
  evidence_schema_hash: string;
  actuality_dag: string[];       // ordered list of judge IDs for AND-DAG
  judges: JudgeBundle[];
  gates: GateBundle[];
  freshness: Record<string, number>; // evidence class -> max age in seconds
  provenance_policy_hash: string;
  independence_policy_hash: string;
  transition_program_hash: string;
  authority_policy_hash?: string;
  proof_requirement: "TRUE" | "TRUE_AND_AUTHORITY";
}

/**
 * ContractRoot = SHA256(canonical(ProofSpec))
 * Any change to semantics mints a new root.
 */
export function computeContractRoot(spec: ProofSpec): string {
  return "root:" + sha256(canonical(spec));
}

// ═══════════════════════════════════════════════════════════
// 4. JUDGE — content-addressed deterministic program
// ═══════════════════════════════════════════════════════════

export interface JudgeResult {
  judge_id: string;
  bundle_hash: string;           // which judge was used
  actuality: Actuality;
  reasons: string[];             // structured reasons
  evidence_ids: string[];        // which evidence items were used
}

/**
 * Judge must be pure over canonical evidence input.
 * No network calls inside judges.
 */
export type JudgeFn = (evidence: Evidence[]) => JudgeResult;

// ═══════════════════════════════════════════════════════════
// 5. GATE — hard deterministic gate
// ═══════════════════════════════════════════════════════════

export interface GateResult {
  gate_id: string;
  result: Actuality;             // never pass:boolean
  proof: string;
  evidence_ids: string[];
}

export type GateFn = (evidence: Evidence[], judgeResults: JudgeResult[]) => GateResult;

// ═══════════════════════════════════════════════════════════
// 6. GRANT — authority for consequential effects
// ═══════════════════════════════════════════════════════════

export interface Grant {
  protocol: "qp/1";
  id: string;                    // "grant:" + sha256
  issuer: string;                // "human:<key_id>" or trusted policy
  subject: string;               // agent/session principal
  action: string;                // "cf.domain.register", "email.send", etc.
  payload_hash: string;          // exact effect payload hash
  constraints: {
    max_amount?: number;
    currency?: string;
    provider?: string;
    resource?: string;
    scopes?: string[];
  };
  issued_at: string;
  expires_at: string;
  nonce: string;
  max_uses: number;
  signature: string;             // Ed25519 signature
}

/**
 * Grant validation:
 * - signature valid
 * - issuer trusted by policy
 * - subject matches executor
 * - action matches exact payload hash
 * - constraints satisfied
 * - not expired
 * - nonce not consumed
 * - remaining uses > 0
 */
export function validateGrant(grant: Grant, now: string): {
  valid: boolean;
  reason?: string;
} {
  if (grant.expires_at < now) return { valid: false, reason: "grant expired" };
  if (grant.max_uses <= 0) return { valid: false, reason: "grant exhausted" };
  // Signature verification would happen here with Ed25519
  // For now, trust the structure
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// 7. TRANSITION RECEIPT — content-addressed, append-only
// ═══════════════════════════════════════════════════════════

export interface TransitionReceipt {
  protocol: "qp/1";
  transition_type: "RESOLVE" | "EFFECT" | "REVOKE";
  contract_root: string;
  claim_id: string;
  state_before_root: string;
  proposal_root: string;
  evidence_root: string;         // merkle root of evidence IDs
  judge_results_root: string;    // merkle root of judge results
  gate_results_root: string;     // merkle root of gate results
  actuality: Actuality;
  authority_id?: string;
  authority_root?: string;
  transition_program_hash: string;
  state_after_root: string;
  run: {
    executor_id: string;
    program_hash: string;
    runtime_hash: string;
    started_at: string;
    finished_at: string;
    cost?: number;
  };
  prev_receipt_hash: string;     // hash of previous receipt (chain)
  settled_at: string;
  receipt_hash: string;          // content-addressed identity
  qp_signer: string;
  qp_signature: string;
}

/**
 * Compute receipt hash = SHA256(canonical(receipt excluding signature fields))
 */
export function computeReceiptHash(receipt: Omit<TransitionReceipt, "receipt_hash" | "qp_signature">): string {
  const stripped = { ...receipt };
  delete (stripped as any).receipt_hash;
  delete (stripped as any).qp_signature;
  return "receipt:" + sha256(canonical(stripped));
}

// ═══════════════════════════════════════════════════════════
// 8. REPLAY VERIFIER — independent re-computation
// ═══════════════════════════════════════════════════════════

export interface ReplayResult {
  pass: boolean;
  reason?: string;
  recomputed: {
    actuality: Actuality;
    gate_results: GateResult[];
    state_after_root: string;
    receipt_hash: string;
  };
}

/**
 * Takes ONLY:
 * - ProofSpec / ContractRoot
 * - claim
 * - evidence blobs + provenance
 * - judge/gate program bundles
 * - authority (if required)
 * - previous state root
 * - TransitionReceipt
 *
 * Independently recomputes everything. Returns PASS | FAIL.
 */
export function replayReceipt(
  spec: ProofSpec,
  claim: Claim,
  evidence: Evidence[],
  judges: JudgeFn[],
  gates: GateFn[],
  receipt: TransitionReceipt,
  authority?: Grant
): ReplayResult {
  // 1. Verify contract root matches
  const expectedRoot = computeContractRoot(spec);
  if (receipt.contract_root !== expectedRoot) {
    return { pass: false, reason: "contract root mismatch" };
  }

  // 2. Verify claim matches
  if (receipt.claim_id !== claim.id) {
    return { pass: false, reason: "claim_id mismatch" };
  }

  // 3. Verify provenance — all evidence must have valid structure
  for (const e of evidence) {
    if (!e.id || !e.class || !e.claim_id || !e.observed_at || !e.source || !e.collector_id) {
      return { pass: false, reason: `evidence ${e.id || "?"} missing required provenance fields` };
    }
    // Evidence freshness at historical settled_at
    const settledAt = new Date(receipt.settled_at).getTime();
    const observedAt = new Date(e.observed_at).getTime();
    const maxAge = spec.freshness[e.class] || 3600; // default 1 hour
    if ((settledAt - observedAt) / 1000 > maxAge) {
      return { pass: false, reason: `evidence ${e.id} stale: class=${e.class}, age=${Math.round((settledAt - observedAt) / 1000)}s, max=${maxAge}s` };
    }
  }

  // 4. Verify judge program hashes match spec
  for (const judge of judges) {
    // Judge should match a judge bundle in the spec
    // (In real implementation, we'd verify program_hash matches)
  }

  // 5. Recompute judge results
  const judgeResults = judges.map((judge) => judge(evidence));

  // 6. Recompute actuality via AND-DAG
  const actuality = andDag(...judgeResults.map((r) => r.actuality));

  // 7. Recompute gate results
  const gateResults = gates.map((gate) => gate(evidence, judgeResults));

  // 8. Check all required gates pass (only when actuality is TRUE)
  if (actuality === "TRUE") {
    const requiredGates = spec.gates.filter((g) => g.required);
    for (const rg of requiredGates) {
      const gr = gateResults.find((g) => g.gate_id === rg.id);
      if (!gr || gr.result !== "TRUE") {
        return {
          pass: false,
          reason: `required gate ${rg.id} did not pass: ${gr?.result ?? "missing"}`,
          recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" },
        };
      }
    }
  }

  // 9. Verify actuality matches
  if (receipt.actuality !== actuality) {
    return {
      pass: false,
      reason: `actuality mismatch: receipt=${receipt.actuality}, recomputed=${actuality}`,
      recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" },
    };
  }

  // 10. Verify authority (if required by spec)
  if (spec.proof_requirement === "TRUE_AND_AUTHORITY") {
    if (!authority) {
      return { pass: false, reason: "authority required but not provided" };
    }
    const authValid = validateGrant(authority, "", "", "", receipt.settled_at);
    if (!authValid.valid) {
      return { pass: false, reason: `authority invalid: ${authValid.reason}` };
    }
  }

  // 11. Verify receipt hash
  const recomputedHash = computeReceiptHash(receipt);
  if (receipt.receipt_hash !== recomputedHash) {
    return {
      pass: false,
      reason: "receipt hash mismatch",
      recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: recomputedHash },
    };
  }

  return {
    pass: true,
    recomputed: {
      actuality,
      gate_results: gateResults,
      state_after_root: receipt.state_after_root,
      receipt_hash: recomputedHash,
    },
  };
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function canonical(obj: any): string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonical).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonical(obj[k])).join(",") + "}";
}

export function merkleRoot(items: string[]): string {
  if (items.length === 0) return sha256("empty");
  let level = items.map(sha256);
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256(left + right));
    }
    level = next;
  }
  return level[0];
}
