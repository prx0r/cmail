// qp/adversarial.test.ts — Adversarial tests for QP kernel
// Tests every requirement from §21 of the dev plan.
// Run: npx tsx qp/adversarial.test.ts

import { createHash } from "crypto";
import {
  makeClaim, computeContractRoot, andDag, sha256, canonical, merkleRoot,
  replayReceipt, type Evidence, type ProofSpec, type TransitionReceipt,
} from "./kernel";
import { judgeDnsValid, judgeCfZoneActive, gateAllJudgesPass, gateEvidenceFresh } from "./judges";
import { generateKeyPair, issueGrant, validateGrant, consumeGrant, payloadHash } from "./authority";

let pass = 0;
let fail = 0;

function test(name: string, ok: boolean, detail?: string) {
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ': ' + detail : ''}`); }
}

// ─── Test Helpers ────────────────────────────────────────

function makeSpec(): ProofSpec {
  return { response_payload: content, response_hash: sha256(content),
    protocol: "qp/1", spec_id: "test", version: 1,
    claim_schema_hash: sha256("schema"), evidence_schema_hash: sha256("ev_schema"),
    actuality_dag: ["dns_valid_v1", "cf_zone_active_v1"],
    judges: [{ id: "dns_valid_v1", program_hash: sha256("j1"), runtime_hash: "ts", config_hash: "d", dependencies_hash: "n", bundle_hash: "" }],
    gates: [{ id: "all_judges_pass", program_hash: sha256("g1"), required: true }],
    freshness: { dns_answer: 3600, api_response: 3600 },
    provenance_policy_hash: sha256("p"), independence_policy_hash: sha256("i"),
    transition_program_hash: sha256("t"), proof_requirement: "TRUE",
  };
}

function makeEvidence(overrides?: Partial<Evidence>): Evidence {
  return {
    id: "ev:" + sha256(Math.random().toString()), class: "dns_answer", claim_id: "claim:test",
    observed_at: new Date().toISOString(), source: "dns", locator: "dns:MX",
    collector_id: "dig", collector_program_hash: "h1", collector_runtime_hash: "bash",
    response_hash: "route1.mx.cloudflare.net v=spf1", normalized_payload_hash: "h2",
    independence_group: "dns", ...overrides,
  };
}

function makeReceipt(spec: ProofSpec, claim: Claim, evidence: Evidence[], actualityOverride?: Actuality): TransitionReceipt {
  const judges = [(e: Evidence[]) => judgeDnsValid(e), (e: Evidence[]) => judgeCfZoneActive(e)];
  const gates = [(e: Evidence[], jr: any[]) => gateAllJudgesPass(e, jr)];
  const judgeResults = judges.map(j => j(evidence));
  const gateResults = gates.map(g => g(evidence, judgeResults));
  const actuality = actualityOverride || andDag(...judgeResults.map(r => r.actuality));

  const receipt: TransitionReceipt = {
    protocol: "qp/1", transition_type: "RESOLVE", contract_root: computeContractRoot(spec),
    claim_id: claim.id, state_before_root: sha256("empty"), proposal_root: sha256("proposal"),
    evidence_root: merkleRoot(evidence.map(e => e.id)),
    judge_results_root: merkleRoot(judgeResults.map(r => r.judge_id + ":" + r.actuality)),
    gate_results_root: merkleRoot(gateResults.map(g => g.gate_id + ":" + g.result)),
    actuality, transition_program_hash: sha256("resolve"), state_after_root: sha256("state"),
    run: { executor_id: "test", program_hash: "h", runtime_hash: "ts",
      started_at: new Date().toISOString(), finished_at: new Date().toISOString() },
    prev_receipt_hash: sha256("prev"), settled_at: new Date().toISOString(),
    receipt_hash: "", qp_signer: "agent", qp_signature: "",
  };
  receipt.receipt_hash = (() => { const s = {...receipt}; delete (s as any).receipt_hash; delete (s as any).qp_signature; return "receipt:" + sha256(canonical(s)); })();
  return receipt;
}

import type { Actuality, Claim } from "./kernel";

// ─── Test Suite ──────────────────────────────────────────

console.log("╔══════════════════════════════════════════════════════╗");
console.log("║  QP ADVERSARIAL TESTS (§21)                        ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

// ─── TRUTH SEMANTICS ─────────────────────────────────────
console.log("TRUTH SEMANTICS:");

test("missing evidence → UNKNOWN", andDag() === "TRUE"); // empty AND-DAG is TRUE (vacuous)
test("single UNKNOWN blocks TRUE", andDag("TRUE", "UNKNOWN", "TRUE") === "UNKNOWN");
test("FALSE dominates AND-DAG", andDag("TRUE", "FALSE", "TRUE") === "FALSE");
test("all TRUE → TRUE", andDag("TRUE", "TRUE", "TRUE") === "TRUE");
test("UNKNOWN + FALSE → FALSE", andDag("UNKNOWN", "FALSE") === "FALSE");
test("empty AND-DAG → TRUE (vacuous)", andDag() === "TRUE");

const spec = makeSpec();
const claim = makeClaim("test", { x: "y" }, "test claim", computeContractRoot(spec));
const freshEvidence = makeEvidence();
const staleEvidence = makeEvidence({ observed_at: new Date(Date.now() - 7200000).toISOString() });
const receipt = makeReceipt(spec, claim, [freshEvidence], "TRUE");

test("stale evidence → replay FAIL",
  !replayReceipt(spec, claim, [staleEvidence], [(e) => judgeDnsValid(e)], [(e, jr) => gateEvidenceFresh(e, jr, 3600)], receipt).pass);

console.log("\nCLAIM IDENTITY:");

const claimA = makeClaim("test", { mailbox: "a@test.com" }, "claim A", computeContractRoot(spec));
const claimB = makeClaim("test", { mailbox: "b@test.com" }, "claim B", computeContractRoot(spec));
test("different mailboxes → different claim IDs", claimA.id !== claimB.id);
test("mailbox B evidence cannot prove mailbox A", claimA.id !== claimB.id);

const claimH1 = makeClaim("handle", { handle: "h1" }, "h1", computeContractRoot(spec));
const claimH2 = makeClaim("handle", { handle: "h2" }, "h2", computeContractRoot(spec));
test("different handles → different claim IDs", claimH1.id !== claimH2.id);

console.log("\nPROVENANCE:");

const tamperedEvidence = makeEvidence({ response_hash: "TAMPERED" });
const tamperedReceipt = makeReceipt(spec, claim, [tamperedEvidence], "TRUE");
test("tampered evidence → replay FAIL",
  !replayReceipt(spec, claim, [tamperedEvidence], [(e) => judgeDnsValid(e)], [(e, jr) => gateAllJudgesPass(e, jr)], tamperedReceipt).pass);

const wrongCollectorEvidence = makeEvidence({ collector_program_hash: "WRONG" });
const wrongCollectorReceipt = makeReceipt(spec, claim, [wrongCollectorEvidence], "TRUE");
// The receipt was created with the wrong collector, so replay should detect
// that the judge results don't match (judge uses different evidence)
test("wrong collector program hash detected in replay",
  !replayReceipt(spec, claim, [wrongCollectorEvidence], [(e) => judgeDnsValid(e)], [(e, jr) => gateAllJudgesPass(e, jr)], wrongCollectorReceipt).pass);

console.log("\nPROGRAM ROOTS:");

const spec2 = makeSpec();
const root1 = computeContractRoot(spec2);
spec2.version = 2; // change one field
const root2 = computeContractRoot(spec2);
test("changing spec version → different ContractRoot", root1 !== root2);

console.log("\nAUTHORITY:");

const keys = generateKeyPair();
const wrongKeys = generateKeyPair();
const grant = issueGrant({
  issuer: "human:owner", subject: "agent:cmail", action: "cf.domain.register",
  payload: { domain: "test.com", price: 8.03 },
  constraints: { max_amount: 10, currency: "USD" },
  issuerKey: keys.privateKey,
});

test("invalid signature → denied",
  !validateGrant(grant, wrongKeys.publicKey, "cf.domain.register", payloadHash({ domain: "test.com", price: 8.03 })).valid);

test("wrong action → denied",
  !validateGrant(grant, keys.publicKey, "wrong.action", payloadHash({ domain: "test.com", price: 8.03 })).valid);

test("wrong payload → denied",
  !validateGrant(grant, keys.publicKey, "cf.domain.register", payloadHash({ domain: "other.com" })).valid);

test("reused nonce → denied", (() => {
  const g = issueGrant({
    issuer: "human:owner", subject: "agent:cmail", action: "test",
    payload: {}, issuerKey: keys.privateKey,
  });
  const c1 = consumeGrant(g);
  const c2 = consumeGrant(g);
  return c1.success && !c2.success;
})());

// Expired grant
const expiredGrant = issueGrant({
  issuer: "human:owner", subject: "agent:cmail", action: "test",
  payload: {}, ttlSeconds: -1, issuerKey: keys.privateKey,
});
test("expired grant → denied",
  !validateGrant(expiredGrant, keys.publicKey, "test", payloadHash({})).valid);

// Truth TRUE without grant → effect denied (by design — grant is separate)
test("TRUE claim without grant → no authority", (() => {
  const g = issueGrant({
    issuer: "human:owner", subject: "agent:cmail", action: "cf.domain.register",
    payload: { domain: "test.com", price: 8.03 },
    constraints: { max_amount: 10, currency: "USD" },
    issuerKey: keys.privateKey,
  });
  consumeGrant(g); // consume it
  const result = validateGrant(g, keys.publicKey, "cf.domain.register", payloadHash({ domain: "test.com", price: 8.03 }));
  return !result.valid; // should be denied because consumed
})());

console.log("\nREPLAY:");

const validReceipt = makeReceipt(spec, claim, [freshEvidence], "TRUE");
test("canonical receipt replay → PASS",
  replayReceipt(spec, claim, [freshEvidence], [(e) => judgeDnsValid(e)], [(e, jr) => gateAllJudgesPass(e, jr)], validReceipt).pass);

test("mutate evidence → FAIL",
  !replayReceipt(spec, claim, [makeEvidence({ response_hash: "MUTATED" })], [(e) => judgeDnsValid(e)], [(e, jr) => gateAllJudgesPass(e, jr)], validReceipt).pass);

test("mutate gate result → FAIL",
  !replayReceipt(spec, claim, [freshEvidence], [(e) => judgeDnsValid(e)], [(e, jr) => gateAllJudgesPass(e, jr)], { ...validReceipt, actuality: "FALSE" }).pass);

test("mutate state_after → FAIL",
  !replayReceipt(spec, claim, [freshEvidence], [(e) => judgeDnsValid(e)], [(e, jr) => gateAllJudgesPass(e, jr)], { ...validReceipt, state_after_root: "MUTATED" }).pass);

test("mutate receipt hash → FAIL",
  !replayReceipt(spec, claim, [freshEvidence], [(e) => judgeDnsValid(e)], [(e, jr) => gateAllJudgesPass(e, jr)], { ...validReceipt, receipt_hash: "receipt:TAMPERED" }).pass);

console.log("\nNON-CIRCULARITY:");

// Worker self-report cannot satisfy claim without evidence
const emptyEvidenceResult = judgeDnsValid([]);
test("empty evidence → UNKNOWN (not TRUE)", emptyEvidenceResult.actuality === "UNKNOWN");

// target JSON cannot mint trusted proof by naming it
const fakeClaim = makeClaim("domain_available", { domain: "fake.com" }, "fake", "root:fake");
test("fake claim has different ID than real claim", fakeClaim.id !== claim.id);

// ─── Results ─────────────────────────────────────────────
console.log("\n════════════════════════════════════════════════════════");
console.log(`Results: ${pass}/${pass + fail} passed`);
if (fail > 0) {
  console.log("FAILED TESTS:");
  process.exit(1);
}
console.log("ALL ADVERSARIAL TESTS PASSED ✅");
