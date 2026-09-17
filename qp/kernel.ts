// qp/kernel.ts — QP Root-of-Trust Kernel (production-grade)
import { createHash } from "crypto";
import { validateGrant as validateGrantAuth } from "./authority";

export type Actuality = "TRUE" | "FALSE" | "UNKNOWN";

export function andDag(...values: Actuality[]): Actuality {
  if (values.includes("FALSE")) return "FALSE";
  if (values.includes("UNKNOWN")) return "UNKNOWN";
  return "TRUE";
}

export interface Evidence {
  id: string;
  class: string;
  claim_id: string;
  observed_at: string;
  source: string;
  locator: string;
  collector_id: string;
  collector_program_hash: string;
  collector_runtime_hash: string;
  request_hash?: string;
  response_payload: string;
  response_hash: string;
  normalized_payload_hash: string;
  nonce?: string;
  independence_group: string;
  signature?: string;
  signer?: string;
}

export interface Claim {
  kind: "CLAIM";
  id: string;
  predicate: string;
  subject: Record<string, string>;
  statement: string;
  contract_root: string;
}

export function makeClaim(predicate: string, subject: Record<string, string>, statement: string, contractRoot: string): Claim {
  const id = "claim:" + sha256(canonical({ predicate, subject })).slice(0, 16);
  return { kind: "CLAIM", id, predicate, subject, statement, contract_root: contractRoot };
}

export interface JudgeBundle { id: string; program_hash: string; runtime_hash: string; config_hash: string; dependencies_hash: string; bundle_hash: string; }
export interface GateBundle { id: string; program_hash: string; required: boolean; }

export interface ProofSpec {
  protocol: "qp/1"; spec_id: string; version: number;
  claim_schema_hash: string; evidence_schema_hash: string;
  actuality_dag: string[]; judges: JudgeBundle[]; gates: GateBundle[];
  freshness: Record<string, number>; provenance_policy_hash: string;
  independence_policy_hash: string; transition_program_hash: string;
  authority_policy_hash?: string; proof_requirement: "TRUE" | "TRUE_AND_AUTHORITY";
}

export function computeContractRoot(spec: ProofSpec): string {
  return "root:" + sha256(canonical(spec));
}

export interface JudgeResult { judge_id: string; bundle_hash: string; actuality: Actuality; reasons: string[]; evidence_ids: string[]; }
export type JudgeFn = (evidence: Evidence[]) => JudgeResult;
export interface GateResult { gate_id: string; result: Actuality; proof: string; evidence_ids: string[]; }
export type GateFn = (evidence: Evidence[], judgeResults: JudgeResult[]) => GateResult;

export interface Grant {
  protocol: "qp/1"; id: string; issuer: string; subject: string; action: string;
  payload_hash: string; constraints: { max_amount?: number; currency?: string; provider?: string; resource?: string; scopes?: string[] };
  issued_at: string; expires_at: string; nonce: string; max_uses: number; signature: string;
}

export interface TransitionReceipt {
  protocol: "qp/1"; transition_type: "RESOLVE" | "EFFECT" | "REVOKE";
  contract_root: string; claim_id: string; state_before_root: string; proposal_root: string;
  evidence_root: string; judge_results_root: string; gate_results_root: string;
  actuality: Actuality; authority_id?: string; authority_root?: string;
  transition_program_hash: string; state_after_root: string;
  run: { executor_id: string; program_hash: string; runtime_hash: string; started_at: string; finished_at: string; cost?: number };
  prev_receipt_hash: string; settled_at: string; receipt_hash: string;
  qp_signer: string; qp_signature: string;
}

export function computeReceiptHash(receipt: Omit<TransitionReceipt, "receipt_hash" | "qp_signature">): string {
  const stripped = { ...receipt };
  delete (stripped as any).receipt_hash;
  delete (stripped as any).qp_signature;
  return "receipt:" + sha256(canonical(stripped));
}

export interface ReplayResult {
  pass: boolean;
  reason?: string;
  recomputed: { actuality: Actuality; gate_results: GateResult[]; state_after_root: string; receipt_hash: string };
}

export interface AuthorityContext { publicKey: string; action: string; payloadHash: string; }

const EMPTY_RECOMPUTED = { actuality: "UNKNOWN" as Actuality, gate_results: [] as GateResult[], state_after_root: "", receipt_hash: "" };

export function replayReceipt(
  spec: ProofSpec, claim: Claim, evidence: Evidence[], judges: JudgeFn[], gates: GateFn[],
  receipt: TransitionReceipt, authority?: Grant, authorityCtx?: AuthorityContext
): ReplayResult {
  // 1. Contract root
  if (receipt.contract_root !== computeContractRoot(spec)) return { pass: false, reason: "contract root mismatch", recomputed: EMPTY_RECOMPUTED };
  // 2. Claim
  if (receipt.claim_id !== claim.id) return { pass: false, reason: "claim_id mismatch", recomputed: EMPTY_RECOMPUTED };
  // 3. Evidence provenance + freshness
  const settledAt = new Date(receipt.settled_at).getTime();
  for (const e of evidence) {
    if (!e.id || !e.class || !e.claim_id || !e.observed_at || !e.source || !e.collector_id) return { pass: false, reason: `evidence ${e.id || "?"} missing provenance`, recomputed: EMPTY_RECOMPUTED };
    const observedAt = new Date(e.observed_at).getTime();
    const maxAge = spec.freshness[e.class] || 3600;
    if ((settledAt - observedAt) / 1000 > maxAge) return { pass: false, reason: `evidence ${e.id} stale`, recomputed: EMPTY_RECOMPUTED };
  }
  // 4. Judge count
  if (judges.length !== spec.judges.length) return { pass: false, reason: `judge count mismatch: ${judges.length} vs ${spec.judges.length}`, recomputed: EMPTY_RECOMPUTED };
  // 5. Recompute
  const judgeResults = judges.map((j) => j(evidence));
  const actuality = andDag(...judgeResults.map((r) => r.actuality));
  const gateResults = gates.map((g) => g(evidence, judgeResults));
  // 6. Required gates (only when TRUE)
  if (actuality === "TRUE") {
    for (const rg of spec.gates.filter((g) => g.required)) {
      const gr = gateResults.find((g) => g.gate_id === rg.id);
      if (!gr || gr.result !== "TRUE") return { pass: false, reason: `required gate ${rg.id} did not pass: ${gr?.result ?? "missing"}`, recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
    }
  }
  // 7. Actuality match
  if (receipt.actuality !== actuality) return { pass: false, reason: `actuality mismatch: receipt=${receipt.actuality}, recomputed=${actuality}`, recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
  // 8. Merkle roots
  if (receipt.evidence_root !== merkleRoot(evidence.map((e) => e.id))) return { pass: false, reason: "evidence root mismatch", recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
  if (receipt.judge_results_root !== merkleRoot(judgeResults.map((r) => r.judge_id + ":" + r.actuality))) return { pass: false, reason: "judge results root mismatch", recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
  if (receipt.gate_results_root !== merkleRoot(gateResults.map((g) => g.gate_id + ":" + g.result))) return { pass: false, reason: "gate results root mismatch", recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
  // 9. Authority
  if (spec.proof_requirement === "TRUE_AND_AUTHORITY") {
    if (!authority) return { pass: false, reason: "authority required but not provided", recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
    if (!authorityCtx) return { pass: false, reason: "authority context required", recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
    const av = validateGrantAuth(authority, authorityCtx.publicKey, authorityCtx.action, authorityCtx.payloadHash, receipt.settled_at);
    if (!av.valid) return { pass: false, reason: `authority invalid: ${av.reason}`, recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: "" } };
  }
  // 10. Receipt hash
  const recomputedHash = computeReceiptHash(receipt);
  if (receipt.receipt_hash !== recomputedHash) return { pass: false, reason: "receipt hash mismatch", recomputed: { actuality, gate_results: gateResults, state_after_root: "", receipt_hash: recomputedHash } };
  return { pass: true, recomputed: { actuality, gate_results: gateResults, state_after_root: receipt.state_after_root, receipt_hash: recomputedHash } };
}

export function sha256(data: string): string { return createHash("sha256").update(data).digest("hex"); }

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
      const right = i + 1 < level.length ? level[i + 1] : sha256("pad:" + left);
      next.push(sha256(left + right));
    }
    level = next;
  }
  return sha256(level[0] + ":" + items.length);
}
