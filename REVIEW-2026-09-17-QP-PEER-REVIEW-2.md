Content-Transfer-Encoding: quoted-printable
Reviewed exact repo state:
   - repo: prx0r/cmail
   - branch reviewed: master
   - head: 3058c0d702d3c3656b56585a3336a3394288c688
   - previous reviewed baseline: 004035a9d95470496a5d9826354c28d949014907
   - delta: 4 commits
The direction is improving, but do NOT treat the P0s as closed yet. The new
effect gateway is a useful skeleton, not yet a constitutional proof
boundary.
TOP-LEVEL VERDICT
What improved:
   - qp/effects.ts exists and cf_purchase now calls it.
   - caller-supplied actor was removed from /mcp request parsing.
   - capacity.list stopped hardcoding fake positive MX/SPF/worker values.
   - FUTUREPLANS converges on the correct product thesis: proof layer, not
   another scheduler.
What remains true:
   - QP still does not control all consequential effects.
   - the live effect path can still manufacture its own authority.
   - TRUE can still be minted without running the pinned ProofSpec/judges.
   - receipts are not cryptographically signed, chained, persisted, or
   replay-settled.
   - current master has obvious TypeScript errors by source inspection.
Treat this commit as a prototype checkpoint, not a trusted release.
P0-A — AUTHENTICATION IS STILL OPEN
src/mcp.ts now derives principal from Authorization, but the token is not
validated. Any Bearer string longer than 10 characters becomes
authenticated:<prefix>.
Worse: getPerms() returns [“READ”,“DRAFT”] when the principal does not
exist in D1. Anonymous therefore also gets READ+DRAFT.
The permission classifier only requires:
   - SEND for email.send
   - DRAFT for email.draft/email.reply
   - READ for EVERYTHING ELSE
That means READ currently covers money/write operations including
name.cf_purchase, name.wire_email, name.phone_purchase, task.complete, etc.
So an unauthenticated caller can reach important mutation paths if provider
credentials are configured.
Required fix:
   1. Build one authenticate(req, env) -> Principal function.
   2. Bearer token must be looked up by HASH in a dedicated
   principals/API-keys table or verified JWT/session. Length is never
   authentication.
   3. Unknown/anonymous principal gets NO permissions except explicit
   public/read-only endpoints.
   4. Build an explicit per-tool permission map. There must be no default
   READ fallback for unknown tools.
   5. Money/external effects require EFFECT + exact capability/grant, not
   READ.
   6. Use token hash / key id as principal identifier, never first 8 raw
   token chars.
   7. CORS must allow Authorization only for trusted dashboard origins; *
   is not an auth model.
Also fix src/index.ts immediately:
   - actorPerms() still returns ADMIN when actor is empty or owner.
   - /admin/address and /admin/alias accept caller-controlled body.actor.
   This is the original authority spoof in a second surface.
Make /admin/* use the same authenticate() middleware. Delete body/query
actor as an authorization input.
Also currently public:
   - GET /api/inbox
   - GET /api/drafts
   These expose message/draft data. Put them behind auth before treating
   this as a secure vault/product.
P0-B — CURRENT MASTER APPEARS NOT TO TYPECHECK
Source-visible compile errors include:
   - src/mcp.ts removed actor from request destructuring but still
   references actor in multiple audit_log calls.
   - src/mcp.ts uses sha256(...) in the new cf_purchase readback without
   importing/defining it.
   - src/capacity.ts still has if (!null) return null;, so generateProof
   always returns null.
   - src/capacity.ts still reads result.pass, but VerifyResult now exposes
   actuality, not pass.
Do not make more architectural changes until:
npm run typecheck npm test
both pass from a clean checkout.
Add CI and make these required before merge. The current head has no commit
status checks, master is unprotected, and the head commit is unsigned. That
is especially weak for software whose product claim is verifiable trust.
P0-C — EFFECT GATEWAY AUTO-MINTS “HUMAN” AUTHORITY
Current name.cf_purchase flow:
   - caller sends confirmed:true + confirm_text
   - MCP generates a fresh Ed25519 keypair itself
   - MCP calls issueGrant({ issuer: “human:owner”, … }) itself
   - MCP passes that generated public key to executeEffect()
This means the system that wants to act also manufactures the “human
authorization” proving it may act.
That destroys the Cognition != Truth != Authority invariant.
Required architecture:
   - MCP NEVER possesses an issuer private key and NEVER issues a human
   grant.
   - human approval occurs through authenticated UI/out-of-band H-task.
   - approval service creates a durable grant using a trusted signer whose
   key is in a Worker secret/HSM-equivalent boundary.
   - executeEffect receives only grant_id.
   - QP loads the grant and issuer trust anchor itself from durable storage.
   - caller may not supply grant public key.
   - proposal.grant_id MUST equal loaded grant.id.
   - subject MUST equal authenticated principal/capability holder.
   - action, canonical payload hash, resource, provider, cost/currency,
   expiry and use count must match exactly.
confirmed:true and BUY domain remain useful UX intent checks, but they are
not authority.
P0-D — GRANT CONSTRAINTS ARE NOT SAFELY SIGNED OR ENFORCED
qp/authority.ts signs:
JSON.stringify(grantBody, Object.keys(grantBody).sort())
Because the replacer array is only the TOP-LEVEL key list, nested
constraints fields are not safely represented as a recursively canonical
signed object. max_amount/provider/resource/scopes therefore are not bound
the way the code implies.
Fix:
   - define one canonical JSON implementation for all QP objects.
   - only valid JSON types; reject undefined/NaN/Infinity.
   - hash/sign canonical bytes recursively.
   - use same canonical function for payload hash, grant id, receipt hash,
   Evidence id and ContractRoot.
   - validate constraints before reservation.
   - actual quoted/settled cost must be part of effect context.
   - enforce max_amount, currency, provider, resource and scopes.
Also:
   - validate issuer against trusted issuer registry.
   - validate subject.
   - reject issued_at in future beyond small clock skew.
   - max_uses needs durable counter semantics; current Set makes max_uses>1
   meaningless.
   - nonce consumption MUST be durable, not process memory.
P0-E — DIRECT EFFECT BYPASSES STILL EXIST
Despite AGENTS.md saying “No direct provider mutators”, src/mcp.ts still
directly invokes:
   - email.send -> env.SENDER.send(…)
   - name.wire_email -> cfWireEmail(…)
   - name.phone_purchase -> telnyxPurchaseNumber(…)
Therefore P0-2 is not fixed system-wide.
Required:
   - move every external mutator into adapter modules.
   - src/mcp.ts may only create proposals / retrieve grants / call QP.
   - ban direct mutator imports in MCP with an architectural test/lint.
   - provider credentials available only to adapters/transport, never
   planner layer.
Recommended CI invariant: grep/AST test fails if src/mcp.ts imports or
calls cfRegisterDomain, cfWireEmail, telnyxPurchaseNumber, SENDER.send,
social write endpoints, etc.
P0-F — DOMAIN “OWNERSHIP” READBACK IS UNSOUND
cf_purchase currently treats:
registrable === false
as evidence that the purchased domain exists in your account.
That only proves the domain is unavailable. It could be owned by anyone.
For domain_owned(domain, account) TRUE, readback must use an authenticated
registrar/account endpoint proving exact domain is in the expected
Cloudflare account/registration record.
Use separate claims:
   - domain_available(D): registrar says registrable before purchase
   - purchase_accepted(D, txn/order): provider accepted purchase
   - domain_owned(D, account): authenticated post-effect account readback
   proves ownership
   - dns_configured(D): DNS state matches desired config
Do not derive ownership from public availability.
Also include quote/cost in the signed proposal. Current proposal has
domain/contact only, so “proof of spend” cannot prove the authorized price.
P0-G — CAPACITY.LIST IS BETTER, BUT STILL MIXES OBSERVATION WITH ASSERTION
Current positives are improved, but remaining problems:
   - zone_status is inferred as “active” merely because domain exists in
   local D1. That is not Cloudflare zone state.
   - routing_rules=0 and catch_all=false are placeholders. Missing
   observation must be UNKNOWN/null, not a negative fact.
   - top-level status becomes “active” solely from mailboxExists.
Return observations, e.g.:
{ kind:"dns_mx", actuality:"OBSERVED", ... } { kind:"cf_zone",
actuality:"NOT_OBSERVED" }
Then QP settles claims. capacity.list must never promote active by itself.
STOP-SHIP EXIT CONDITIONS FOR PART 1
Do not continue social platform expansion until all are true:
   - clean typecheck
   - clean tests
   - authenticated principal required for all private routes
   - no caller actor/admin bypass anywhere
   - no anonymous mutation
   - MCP cannot issue its own authority
   - every external mutator routes through QP
   - no domain ownership proof from registrable:false
   - no QP object signed/hashed with noncanonical JSON
   - durable grant consumption exists
Part 2 contains the required QP kernel/effect gateway redesign.

---

Content-Transfer-Encoding: quoted-printable
Continue from part 1. This part is about making QP itself legitimate.
CORE PRINCIPLE
A QP effect is valid only when ALL of these are independently pinned and
replayable:
ContractRoot exact Claim authenticated Evidence pinned deterministic Judge
programs required Gates independent Authority deterministic Transition
signed TransitionReceipt durable append-only settlement independent Replay
The current code has the names, but several are still placeholders. Fix
semantics before adding more adapters.
   1. MAKE PROOFSPEC A REAL LOADED CONTRACT
Today proofspecs/*.json are not one uniform executable contract.
Examples such as account_owned.v1.json and oauth_authorized.v1.json omit
fields required by the TypeScript ProofSpec interface. Several hashes are
human labels like:
"sha256:judgeAccountAuthenticated"
rather than actual SHA-256 digests. bundle_hash is often empty.
Required:
   - define ProofSpecSchema with runtime validation (Zod/Valibot/etc.).
   - every ProofSpec MUST have exactly the same required structural fields.
   - load specs at startup/build into a registry indexed by ContractRoot
   and spec_id/version.
   - reject malformed or incomplete specs.
   - reject unknown judge/gate ids.
   - reject duplicate ids.
   - reject placeholder/non-hex hashes.
   - canonicalize spec and compute ContractRoot from the actual complete
   bytes.
   - never mutate a loaded spec.
Suggested shape:
ProofSpec { protocol: "qp/1" spec_id version claim_schema_hash
evidence_schema_hash judges: JudgeRef[] actuality_dag gates: GateRef[]
freshness provenance_policy independence_policy transition_program_hash
authority_policy_hash? proof_requirement }
   1. PROGRAM REGISTRY, NOT FUNCTION ARRAYS SUPPLIED BY CALLER
replayReceipt currently accepts judges: JudgeFn[] and only checks their
COUNT against spec.judges. The code comment itself admits source-hash
verification is not implemented.
That is not a proof.
Required:
   - compile/build every judge/gate/transition/probe into a ProgramBundle.
   - ProgramBundle identity = hash(source bytes + runtime identity + config
   + dependency lock/version).
   - ProofSpec references exact bundle_hash.
   - QP resolves bundle hash from trusted ProgramRegistry.
   - caller does NOT supply an arbitrary judge function.
   - if referenced bundle missing or hash differs -> UNKNOWN/invalid proof,
   never fallback.
judge count matches must be deleted as a security claim.
   1. ACTUALITY_DAG MUST BE EXECUTED FROM THE SPEC
Current replay ignores spec.actuality_dag and computes a simple AND of
whichever judge functions the caller passed.
Required:
   - define a small explicit DAG language, e.g. nodes:
      - JUDGE(id)
      - AND(children)
      - OR(children)
      - NOT(child) only if you truly need it
      - THRESHOLD only if formally justified
   - validate acyclic graph at spec load.
   - evaluate exactly the graph committed in ContractRoot.
   - missing required node -> UNKNOWN/invalid settlement.
Never let runtime call order silently define truth semantics.
   1. EVIDENCE MUST BE CONTENT-ADDRESSED AND SELF-CHECKING
Current replay checks that metadata fields exist and checks freshness, but
it does NOT verify:
   - sha256(response_payload) == response_hash
   - evidence id matches canonical evidence content
   - evidence.claim_id == claim.id
   - collector program/runtime is allowed by the ProofSpec
   - normalized_payload_hash is actually derived from normalization
   - signature/signer when required
   - independence-group policy
Implement one constructor:
makeEvidence(input, collectorIdentity) -> Evidence
It computes everything. Callers do not hand-author IDs/hashes.
Evidence ID should commit to at least:
   - protocol/schema version
   - claim_id
   - class
   - observed_at
   - source + locator
   - collector bundle hash/runtime hash
   - request hash
   - response hash
   - normalized payload hash
   - nonce/challenge
   - independence group
Do not use Date.now()/random labels as evidence identity.
Replay must recompute all derivable hashes and fail closed.
   1. FRESHNESS MUST BE STRICT
Current replay does:
const maxAge = spec.freshness[e.class] || 3600
Unknown evidence classes silently receive a one-hour policy. That allows
uncontracted evidence into a proof.
Required:
   - evidence class absent from spec freshness/provenance policy -> reject.
   - invalid observed_at -> reject.
   - evidence from the future beyond clock-skew tolerance -> reject.
   - freshness evaluated against receipt.settled_at, not Date.now().
   - each judge must declare which classes it consumes.
UNKNOWN is for unavailable/ambiguous world information. Malformed evidence
is not a factual FALSE; it is invalid proof input.
   1. CLAIM MUST BE BOUND TO CONTRACTROOT
replayReceipt verifies receipt.contract_root and receipt.claim_id, but does
not verify:
claim.contract_root === computeContractRoot(spec)
Add it.
Also validate the claim subject against the proof spec’s claim schema. No
generic Record<string,string> should bypass schema.
   1. JUDGE AND GATE RESULT ROOTS MUST COMMIT TO FULL RESULTS
Current roots hash only:
judge_id + actuality gate_id + result
That excludes reasons, evidence_ids and judge bundle hash.
Canonical root leaves should be full result objects:
JudgeResult { judge_id bundle_hash actuality reasons evidence_ids }
GateResult { gate_id result evidence_ids proof/details }
Sort deterministically or use spec-defined order.
   1. REQUIRED GATES MUST MATCH EXACT SPEC
Do not only search for required gate ids among arbitrary runtime results.
At settlement:
   - resolve exact gate bundle hashes from ProgramRegistry.
   - execute gates in spec order.
   - no undeclared gate may decide truth.
   - missing required gate -> invalid/UNKNOWN.
   - duplicate result ids -> invalid.
   1. FIX THE EFFECT GATEWAY’S FUNDAMENTAL SEMANTICS
qp/effects.ts currently has several critical shortcuts:
A. required_claims is never checked.
B. ProofSpec is optional.
C. readback callback returns exists, and exists=true directly becomes TRUE.
D. no actual judge or gate runs.
E. readback function is caller-supplied and therefore part of the untrusted
effect request path.
F. contract_root is generated using computeReceiptHash(spec as any) or
empty string.
G. claim_id is an ad-hoc string rather than Claim.id.
H. state_before_root is constant hash(“state:before”).
I. state_after_root is just hash({action, settled}), not canonical state
transition.
J. prev_receipt_hash is constant hash(“prev”).
K. qp_signature is empty.
L. transition/collector program hashes are hashes of labels like
“effect-gateway”, not program bytes.
Replace executeEffect signature with something closer to:
executeEffect({ principal, proposal, grantId, effectSpecId })
QP internally resolves:
   - authenticated principal
   - durable grant
   - EffectSpec
   - ProofSpec/ContractRoot
   - prerequisite settled claims
   - trusted adapter program
   - trusted readback/probe program
   - judges/gates
   - transition program
   - signer
The MCP caller must not inject executable functions.
   1. DEFINE EFFECTSPEC
ProofSpec says how a resulting claim is proven. EffectSpec should say how
an allowed world mutation is attempted.
Suggested:
EffectSpec { id: "cf.domain.register/v1" action payload_schema_hash
adapter_bundle_hash readback_probe_bundle_hash resulting_claim_spec_id
authority_policy_hash idempotency_strategy reconciliation_strategy }
Hash EffectSpec too. Proposal references exact EffectSpec root.
   1. PREPARE BEFORE EXECUTE — CRASH-SAFE EFFECT JOURNAL
Current code consumes in-memory grant then calls provider. A Worker crash
after provider success but before readback loses the settlement path.
Use durable phases:
PROPOSED -> AUTHORIZED -> PREPARED (persist effect_attempt + idempotency
key) -> EXECUTING -> EXECUTED_UNVERIFIED -> PROVEN_TRUE | PROVEN_FALSE |
UNKNOWN_RECONCILE
Before external call, atomically persist:
   - proposal root
   - grant id / reserved use
   - idempotency key
   - EffectSpec root
   - expected resulting claim
   - started_at
After provider call, persist raw response hash/provider transaction id
BEFORE readback.
A retry must reuse the same idempotency key / reconcile instead of spending
twice.
   1. RECEIPTS MUST BE REAL
A TransitionReceipt should commit to:
   - protocol
   - transition type
   - ContractRoot
   - EffectSpec root where applicable
   - Claim id
   - state_before_root
   - proposal_root
   - evidence_root
   - full judge-results root
   - full gate-results root
   - actuality
   - authority id + authority root
   - transition program bundle hash
   - state_after_root
   - run metadata/program hashes
   - previous receipt/event root
   - settled_at
   - receipt_hash
   - QP signer key id
   - QP signature over receipt_hash/domain-separated bytes
Replay MUST verify signature from trusted QP signer registry.
Do not market “cryptographic proof” while qp_signature is empty.
   1. STATE TRANSITION MUST BE RECOMPUTABLE
Kernel status says state transition is fixed, but replay currently returns
receipt.state_after_root without recomputing it.
Implement:
transition(stateBefore, claim, actuality, proposal, authority) ->
stateAfter
Transition program is content-addressed and committed in ProofSpec.
Replay loads state_before, re-executes transition and checks
state_after_root.
Canonical state should be an append-only projection of settled
claims/receipts, not task flags.
   1. RECEIPT CHAIN MUST ACTUALLY CHAIN
prev_receipt_hash cannot be sha256(“prev”).
Use durable head per scope/tenant/claim ledger. On settle:
   - read previous head
   - insert receipt referencing head
   - atomically update head
   - append event hash
Replay can then verify chain continuity.
   1. MOVE QP MIGRATION INTO THE REAL MIGRATION PATH
wrangler.toml uses:
migrations_dir = "migrations"
But QP schema is in qp/migrations/0001_qp_core.sql.
It is therefore not part of the configured D1 migration stream.
Move/version it as something like:
migrations/0004_qp_core.sql
Then implement QPStore over those actual tables.
Do not leave qp_contracts/claims/evidence/grants/receipts/events as
documentation-only tables.
   1. AUTHORITY STORAGE
Replace consumedNonces Set with D1 state.
Use conditional atomic update semantics such as:
UPDATE qp_grants SET uses = uses + 1, status = CASE WHEN uses + 1 >=
max_uses THEN 'consumed' ELSE status END WHERE grant_id = ? AND status =
'active' AND uses < max_uses AND expires_at > ?
Then require exactly one affected row.
Tie reservation to effect_attempt in the same durable operation/batch
strategy as supported by D1.
   1. CLEAN UP DUPLICATE QP SYSTEMS
There are still at least three proof models:
   - src/capacity.ts legacy CapacityProof/pass boolean
   - mcp/interface.ts acom/0.1 QPReceipt/proof levels/PASS-FAIL
   - qp/kernel.ts qp/1 Actuality/TransitionReceipt
Delete or archive the first two from runtime.
mcp/domain.ts currently simulates execution and manufactures acom/0.1 proof
receipts. It must not coexist with production QP.
There should be ONE proof type and ONE settlement kernel.
   1. FIX EMAIL CLAIM SEMANTICS
BUILD-NOTES now says infrastructure verification is “stronger than a single
email receipt.” That is a category error.
They prove different propositions:
   - email_infrastructure_configured(domain): MX/routing/worker/mailbox
   configuration appears correct.
   - email_receives(address): a fresh independently originated nonce
   actually arrived at exact address.
For email_receives, the existing ProofSpec is correct to require the
round-trip. Infrastructure alone can never establish TRUE.
Fix qp/probes/email-roundtrip.ts too:
   - response_payload must contain canonical observation payload.
   - response_hash must be SHA256(response_payload), not raw JSON.
   - judge must parse response_payload, never response_hash.
   - evidence IDs content-address the full evidence.
   - poll exact mailbox A.
   - independent sender identity recorded.
   - raw message hash/message id/timestamps bound.
   1. DOMAIN CLAIM SEMANTICS

---

Content-Transfer-Encoding: quoted-printable
Continue from part 2. This is the concrete build order. Follow it in
sequence. Do not parallelize platform expansion before the foundation
passes.
PHASE 0 — FREEZE EFFECTFUL DEVELOPMENT
Until P0 auth/authority is fixed:
   - disable/quarantine live domain purchase, phone purchase, email send
   and DNS mutation routes in production OR require an external admin secret
   not derivable from request body.
   - do not run real-money integration tests from public MCP.
   - preserve existing provider adapters, but stop adding new ones.
The priority is making one path trustworthy, not increasing endpoint count.
PHASE 1 — MAKE THE REPO BUILDABLE AND TESTABLE
   1. Fix current compile errors:
   - replace all stale actor references in src/mcp.ts with authenticated
   principal where audit identity is intended.
   - import/use one canonical sha256 helper or remove ad-hoc hashes.
   - remove if (!null) return null in src/capacity.ts.
   - remove result.pass; legacy capacity code should be deleted rather than
   patched if possible.
   1.
   Replace package scripts with explicit suites, e.g.:
   “typecheck”: “tsc --noEmit”
   “test”: “vitest run”
   “test:qp”: “vitest run qp/
*/*.test.ts" “test:security”: "vitest run security/*/*.test.ts”
   “verify”: “npm run typecheck && npm test”
   2.
   Rewrite qp/adversarial.test.ts as normal Vitest tests.
The current file contains self-contradictory/broken assertions:
   - test label says “missing evidence -> UNKNOWN” while asserting empty
   AND DAG is TRUE.
   - makeEvidence omits required response_payload.
   - wrong collector hash is expected to fail even though replay does not
   verify collector hash.
   - consumed grant is expected to fail validateGrant even though
   validateGrant does not check durable consumption.
   - makeReceipt computes roots using two judges while makeSpec declares
   one.
   - gateEvidenceFresh is called with the wrong argument shape in at least
   one case.
Do not claim “26 adversarial tests pass” until these are real assertions
under CI.
   1. Add GitHub Actions:
   - npm ci
   - npm run typecheck
   - npm test
   - ProofSpec schema validation
   - architectural boundary tests
   - migration validation
   1. Canonical branch:
   - repo default branch is still main while active code is on master.
   - choose one canonical branch.
   - merge/repoint once, then protect it.
   - require CI before merge.
   - release proof software from signed tags/build manifests, not mutable
   branch names.
PHASE 2 — ONE AUTH SYSTEM FOR EVERY HTTP/MCP SURFACE
Create src/auth.ts:
interface Principal { id: string tenant_id: string roles: string[]
capabilities: string[] authn_method: "api_key"|"session"|"jwt" }
authenticate(req, env): Promise<Principal | null> authorize(principal,
operation, resource): Decision
API keys:
   - store hash only.
   - token format should contain nonsecret key id + random secret.
   - lookup key id, constant-time verify hash/secret as appropriate.
   - support revoke/expiry/tenant.
No endpoint receives actor from caller for authorization.
Apply middleware to:
   - /mcp
   - /admin/*
   - /api/inbox
   - /api/drafts
   - sensitive stats/UI
   - future OAuth/approval endpoints
Define explicit operation table:
email.read email.draft email.send domain.read domain.purchase dns.mutate
phone.read phone.purchase social.read social.post qp.grant.approve
qp.receipt.read
Unknown operation -> DENY.
Do not map arbitrary tools to READ by default.
Add tests:
   - no auth -> private endpoint 401
   - invalid token -> 401
   - valid read token -> cannot purchase
   - valid writer without grant -> cannot purchase
   - caller actor=“owner” has no effect
   - empty actor cannot become admin
   - cross-tenant resource -> denied
PHASE 3 — REAL QP PERSISTENCE
Move QP migration into configured migrations/ path, version after 0003.
Create qp/store.ts or src/qp-store.ts with a narrow interface:
putContract(spec) getContract(root) putClaim(claim) putEvidence(evidence)
createGrant(grant) reserveGrant(grantId, effectAttemptId, now)
appendEffectAttempt(attempt) updateEffectAttempt(...)
appendReceipt(receipt) appendEvent(event) getLedgerHead(scope)
getSettledClaim(claimId, contractRoot)
No direct SQL scattered through MCP for QP state.
Add tables/constraints for:
   - principals/api keys if not separate
   - trusted issuers
   - QP signers/public keys
   - effect specs/program registry if stored dynamically
   - effect_attempts + idempotency keys
   - ledger head per tenant/scope
Invariants:
   - grant nonce unique
   - receipt hash unique
   - effect idempotency key unique
   - event seq/hash unique
   - foreign keys from receipt -> contract/claim/grant
   - no receipt overwrite
   - no evidence overwrite under same id with different bytes
PHASE 4 — CANONICAL CRYPTO PRIMITIVES
Create one module qp/crypto.ts:
canonicalJson(value) sha256Bytes/string(value) hashObject(domain, value)
signDigest(domain, digest, privateKey) verifyDigest(...) merkleRoot(domain,
leaves)
Use domain separation:
qp:proofspec:v1 qp:evidence:v1 qp:grant:v1 qp:proposal:v1
qp:judge-result:v1 qp:gate-result:v1 qp:receipt:v1 qp:event:v1
Do not concatenate arbitrary strings without domains/length framing.
Evidence/receipt/grant IDs should be full content hashes or
collision-resistant full digest identifiers; truncation is okay only for
display aliases, not identity.
PHASE 5 — TRUSTED PROGRAM REGISTRY
Create build-time program manifest:
program-manifest.json
For each judge/gate/transition/probe/adapter:
   - id
   - source hash
   - runtime/workerd version identifier
   - config hash
   - dependency lock hash
   - bundle hash
   - git commit/tree/build artifact hash
On build, generate manifest from actual files.
At runtime, ProofSpecs reference bundle hashes from this manifest.
Missing hash -> fail closed.
Do not use:
sha256("effect-gateway") runtime_hash: "node:20"
when running in Cloudflare Workers. Hash the actual build/program identity.
PHASE 6 — MAKE ONE PROOFSPEC FULLY REAL
Start with a read-only claim because it has no authority complexity:
domain_available(domain)
Flow:
   1. load domain_available.v1 ProofSpec.
   2. make exact Claim.
   3. registrar probe performs fresh provider check.
   4. probe emits content-addressed Evidence.
   5. QP resolves pinned judge.
   6. judge returns TRUE/FALSE/UNKNOWN.
   7. gates enforce freshness/provenance.
   8. deterministic transition settles state.
   9. QP signs TransitionReceipt.
   10. store receipt/event.
   11. replay from stored spec+claim+evidence+program manifest.
   12. independent receipt.verify returns pass.
Acceptance:
   - changing one evidence byte -> replay fail.
   - changing collector hash -> fail.
   - stale evidence -> fail/UNKNOWN according to protocol.
   - malformed registrar response -> UNKNOWN.
   - NXDOMAIN alone cannot yield TRUE.
   - different domain cannot reuse evidence.
   - different ContractRoot cannot reuse receipt.
PHASE 7 — THEN BUILD THE FIRST REAL EFFECT: DOMAIN PURCHASE
Use these objects:
Claim A = domain_available(D) Quote Q = provider quote with
price/currency/expiry Grant G = authorized cf.domain.register for exact
payload+max price EffectProposal P = {domain, account, quote_id, max_cost,
contact_hash} Claim B = purchase_accepted(D, transaction) Claim C =
domain_owned(D, account)
Preconditions:
   - Claim A settled TRUE and fresh.
   - quote fresh.
   - Grant G active, subject matches principal, provider/resource/cost
   constraints pass.
Flow:
   1. create effect_attempt PREPARED durably.
   2. reserve grant atomically.
   3. call Cloudflare with stable idempotency/reconciliation identity where
   provider supports it.
   4. immediately persist provider response/transaction evidence.
   5. read back exact domain from expected account/registrar state.
   6. build ownership evidence.
   7. run domain_owned ProofSpec judge/gates.
   8. settle signed receipt TRUE/FALSE/UNKNOWN.
   9. if provider call may have succeeded but readback fails ->
   UNKNOWN_RECONCILE, never blindly retry purchase.
   10. reconciliation job reads account state and settles later.
The final response to agent should include:
   - effect_attempt_id
   - receipt_hash
   - actuality
   - provider transaction/order id if safe
   - observed cost
   - resulting claim id
Add qp.receipt.get and qp.receipt.verify tools so a receipt hash is usable.
PHASE 8 — SECURITY/ADVERSARIAL TEST MATRIX
AUTH:
   - arbitrary long bearer token rejected
   - anonymous cannot DRAFT/SEND/PURCHASE
   - body actor owner ignored
   - admin endpoints require admin principal
   - revoked key rejected
   - cross-tenant key rejected
AUTHORITY:
   - wrong signer rejected
   - untrusted issuer rejected
   - wrong subject rejected
   - wrong action rejected
   - one payload byte changed rejected
   - max price exceeded rejected
   - wrong provider/resource rejected
   - expired/revoked grant rejected
   - reuse after max_uses rejected across simulated restart
   - concurrent double reservation: exactly one succeeds
EVIDENCE:
   - response payload mutation detected
   - response hash mutation detected
   - wrong claim id detected
   - wrong collector bundle detected
   - stale/future evidence rejected
   - evidence class not in ProofSpec rejected
   - independence policy violation rejected
RECEIPTS:
   - unsigned receipt rejected
   - wrong signer rejected
   - changed state_after rejected
   - changed evidence set rejected
   - changed judge reason/evidence ids changes root
   - broken prev link rejected
   - wrong ContractRoot rejected
   - wrong transition program rejected
EFFECTS:
   - missing prerequisite claim denied
   - arbitrary caller readback function impossible by API design
   - adapter success + failed readback -> UNKNOWN, not TRUE
   - adapter error -> effect attempt persisted
   - crash after provider success -> reconciliation finds state and settles
   without duplicate purchase
   - retry uses same attempt/idempotency identity
SEMANTICS:
   - registrable=false never proves domain_owned
   - infrastructure configured never proves email_receives
   - public YouTube channel existence never proves account_owned
   - access token presence never alone proves oauth_authorized
PHASE 9 — EMAIL PROOF IMPLEMENTATION
Create separate ProofSpecs/claims:
email_infrastructure_configured(domain) email_route_configured(address)
email_receives(address) email_send_accepted(message)
email_delivered(message) // only if independently observable
For email_receives:
   - QP generates nonce.
   - independent sender sends exact nonce to exact mailbox.
   - cmail records raw inbound message.
   - probe queries exact mailbox/address + nonce.
   - evidence includes sender, recipient, nonce, raw-message hash, provider
   message id, sent/received times.
   - TRUE only after nonce judge.
capacity.verify receive_email must not use infrastructure-only verifier.
PHASE 10 — DELETE TRUTH BY TASK STATUS
Today task.deliver/task.complete and mission.status still form a parallel
state system.
Refactor:
   - tasks are intentions/work items.
   - tasks can be DONE operationally, but DONE never makes a claim TRUE.
   - mission projection reads settled QP claims.
   - capability unlocks derive only from claims settled TRUE under accepted
   ContractRoots.
   - task completion may trigger a probe, not truth promotion.
PHASE 11 — REMOVE LEGACY RUNTIMES
Delete/archive from production imports:
   - src/capacity.ts legacy proofs
   - mcp/interface.ts acom/0.1 receipt model
   - mcp/domain.ts simulated purchase/proofs
   - any pass:boolean proof logic
   - scripts that label infrastructure-only 7/7 as email_receives CERTIFIED
Keep useful probes, but have them emit Evidence for QP rather than verdicts.
PHASE 12 — EDGE GRAPH FIXES
qp/edges.ts REQUIRES semantics are A -> B means A requires B.
evaluationOrder currently travers

---

Content-Transfer-Encoding: quoted-printable
Final part. This assumes parts 1–3 are implemented first. The product
direction is now clearer: setup.social should become a trustworthy
proof/authority layer around agent actions, not another social scheduler.
   1. TARGET ARCHITECTURE
Keep the system layered and make the trust boundary explicit:
A. AUTH / VAULT
   - authenticates human + agent principals
   - stores OAuth/API credentials
   - issues capabilities/grants through trusted human/policy authority
   - raw credentials never returned to agents
B. PROPOSAL / AUTHORITY
   - agent proposes desired world transition
   - exact canonical payload + resource + price/currency/provider committed
   - human/policy approves -> durable signed Grant
   - proposal does not execute itself
C. QP SETTLEMENT KERNEL
   - loads frozen ProofSpec / EffectSpec
   - checks prerequisite settled claims
   - validates/reserves authority
   - prepares crash-safe effect attempt
   - invokes trusted adapter by pinned program identity
   - collects independent evidence through pinned probes
   - runs pinned judges + gates
   - computes TRUE/FALSE/UNKNOWN
   - applies deterministic state transition
   - signs and appends TransitionReceipt
   - independently replayable from stored artifacts
D. ADAPTER / TRANSPORT LAYER
   - Cloudflare, Telnyx, Google, Meta, TikTok, X, Postiz, Monid, etc.
   - adapters can ATTEMPT actions and OBSERVE provider responses
   - adapters can never declare a QP fact TRUE
   - credentials live here/vault, not in planner
E. INDEPENDENT PROBES / READBACK
   - separate path from write adapter where possible
   - authenticated provider account readback for ownership
   - public/read API for observable publication state
   - nonce/challenge probes for receipt/control claims
   - every result emitted as provenance-bearing Evidence
F. RECEIPT / EVENT LEDGER
   - append-only claims/evidence/grants/effect attempts/receipts/events
   - signed ledger head / hash chain
   - receipt verifier can operate independently
G. MCP SURFACE
The MCP should expose intentions and proofs, not raw provider APIs:
qp.claim.get / qp.claim.list qp.prove qp.grant.request qp.grant.get
qp.grant.revoke qp.effect.propose qp.effect.execute qp.effect.status
qp.receipt.get qp.receipt.verify qp.replay
Platform convenience tools can wrap these, e.g.:
social.youtube.publish domain.purchase
but they must reduce to the same QP primitives internally.
Remove or deprecate capacity.verify(type, arbitrary_evidence_string) as a
truth-changing primitive. A caller must not submit arbitrary text and ask
the system to promote it. Registered probes collect evidence; QP settles it.
   1. QP SHOULD BE GENERIC, setup.social SHOULD BE A CONSUMER
Do not hardwire the root kernel to YouTube/email/domain terminology.
QP core knows only:
   - Claim
   - Evidence
   - ProofSpec
   - ProgramBundle
   - Actuality
   - Grant
   - EffectSpec
   - Gate/Judge results
   - TransitionReceipt
   - State/Event ledger
   - Replay
setup.social supplies domain-specific ProofSpecs, probes and effect
adapters.
That keeps QP reusable later for payments, commerce, security automation,
deployments, data jobs, etc.
   1. MONID ROLE
Use Monid as a connector/execution/observation substrate, NOT as the source
of truth.
The useful pieces from the Monid review:
   - declarative connector catalog
   - content-addressed fnTable
   - sealed endpoint units
   - deterministic compilation
   - input/output schemas
   - usage/cost modelling
   - replay fixtures
Those are excellent for reducing integration work.
Trust model:
QP -> invokes pinned Monid sealed unit / connector -> provider -> returns
response/evidence candidate QP -> independent probe/readback -> judges ->
receipt
Pin:
   - Monid repo commit/tree
   - compiled sealed-unit hash
   - connector EndpointDoc hash
   - fnTable closure hashes
   - Monid engine/runtime version
A Monid response is evidence, not truth.
Important: Monid’s engine intentionally evaluates repo-authored connector
functions via new Function. That is acceptable inside Monid’s own trusted
connector model, but it means Monid must remain OUTSIDE the QP
signer/kernel trust boundary. QP should never load arbitrary Monid
connector code into the kernel process and assume it is safe simply because
it is content-addressed.
Do not integrate Monid deeply until the QP v1 acceptance milestone passes.
Otherwise you multiply connectors before the truth boundary works.
   1. POSTIZ ROLE
Given FUTUREPLANS, do NOT turn setup.social into a Postiz clone.
Postiz is useful where it saves ugly implementation work:
   - scheduling
   - media upload workflows
   - platform-specific posting normalization
   - OAuth/provider integrations
Use it as an optional executor:
grant -> QP effect -> Postiz execute -> direct platform readback -> QP
receipt
Postiz saying “success” is only execution evidence.
If direct APIs are simpler for a platform, use them directly. Do not clone
the whole Postiz repo just because it is open source. Import/reuse only
code whose maintenance cost is lower than treating Postiz as an external
executor.
The proof layer should remain executor-agnostic: Postiz can disappear and
the claim/receipt semantics remain unchanged.
   1. FIRST SOCIAL VERTICAL: YOUTUBE
YouTube is the best first end-to-end social proof because
account/readback/post APIs are comparatively structured.
Build the claim chain:
A. account_owned(youtube, channel_id, principal)
Evidence:
   - authenticated channels.list?mine=true
   - exact channel ID
   - credential/vault principal binding
B. oauth_authorized(youtube, channel_id, required_scopes)
Evidence:
   - verified OAuth grant/token metadata
   - actual scopes/introspection/provider authorization state
   - token existence alone is insufficient
C. can_post(youtube, channel_id)
Derive only under exact policy from B + any provider restrictions required.
This is a capability fact, not authority for a particular post.
D. POST EFFECT
Proposal commits:
   - channel ID
   - source artifact hash
   - title
   - description
   - privacy status
   - tags/category/settings where relevant
   - expected cost/quota semantics if you care
Human/policy Grant authorizes exact proposal hash or bounded template.
QP executes upload through direct Google API/Postiz.
E. RESULTING CLAIMS
Separate claims rather than one vague post_success:
video_exists(youtube, video_id) video_bound_to_channel(video_id,
channel_id) video_metadata_matches(video_id, expected_metadata)
video_visibility(video_id, expected_visibility)
video_processing_complete(video_id)
Settle a higher-level video_publish_satisfied(...) only from these defined
dependencies.
   1. ARTIFACT HASH SEMANTICS
Do not claim the YouTube-hosted video bytes equal the uploaded file hash
after YouTube transcodes it.
Correct binding:
   - hash exact source artifact bytes BEFORE upload.
   - include source_artifact_hash in the authorized proposal/effect attempt.
   - bind provider upload/video ID returned by the effect to that proposal.
   - independently read back observable metadata/state from YouTube.
This proves:
“the exact source artifact authorized in proposal P was submitted in effect
E and resulted in YouTube video ID V whose observable state matches the
contracted metadata.”
It does NOT prove the transcoded hosted bytes are SHA256-identical.
If later you need media-equivalence verification, create a separate
perceptual/transcode claim with explicit algorithm/tolerance. Never
silently substitute perceptual equivalence for exact byte equality.
   1. NEXT SOCIAL ADAPTERS
After YouTube passes the same replay/adversarial criteria:
Instagram:
   - distinguish existing IG professional account, Meta Page binding, OAuth
   scopes, media container creation, publication, permalink/readback.
TikTok:
   - existing authorized TikTok user/account first; Content Posting API is
   not an account-signup API.
   - prove publish status through the official status/read API.
X:
   - prove authenticated user ID + scopes.
   - post effect -> exact tweet ID -> direct readback.
For all platforms use the same abstract sequence:
account_owned oauth_authorized can_<capability> signed authority for exact
effect execute independent readback resulting claim(s) signed receipt
The platform adapter must not invent account ownership from a public handle
existing.
   1. PROOF OF SPEND
This is potentially the strongest commercial wedge if implemented exactly.
A spend proof should commit to TWO separate things:
AUTHORITY:
   - issuer/principal
   - exact or bounded action
   - provider
   - resource
   - quote ID / quote evidence
   - max amount
   - currency
   - expiry
   - payload hash
WORLD RESULT:
   - provider transaction/order ID
   - actual charged/settled amount where observable
   - resulting owned asset/service
   - authenticated post-effect readback
For domain purchase:
QuoteReceipt + Grant(max $10.50 USD, cloudflare, domain X) + EffectAttempt
+ Provider transaction evidence + domain_owned(X, account) readback =
SpendReceipt
Do not conflate “provider accepted request” with “asset now owned”.
If actual charge cannot be independently obtained immediately, receipt
actuality for charged_amount_exact is UNKNOWN while domain_owned may be
TRUE. QP should tolerate multiple precise claims instead of forcing one
coarse status.
   1. READ-ONLY PROOFS FIRST
FUTUREPLANS Phase 1 (“proof of presence”) is a good product milestone
because it lets you harden QP without money/write risk.
Suggested public demo:
prove youtube channel exists prove account-owned after OAuth prove latest
video state return signed receipt + independent verifier output
The value is much clearer if anyone can verify the receipt without trusting
the dashboard.
   1. TRANSPARENT VERIFICATION, PRIVATE EXECUTION
The statement in FUTUREPLANS that QP should be closed because open source
would allow “tampering” is not technically the strongest framing.
Tamper resistance should come from:
   - content hashes
   - frozen ContractRoots
   - signed receipts
   - trusted signer keys
   - reproducible/pinned program identity
Secrecy is not the integrity primitive.
Commercially sensible split:
PRIVATE:
   - hosted execution service
   - credentials/vault
   - provider developer-app secrets
   - approval UX
   - operational anti-abuse logic
   - signer private keys
TRANSPARENT/PUBLIC OR REPRODUCIBLE:
   - receipt schema
   - ProofSpecs/ContractRoots
   - public signer keys
   - replay verifier
   - program manifest/hashes
   - protocol semantics
That makes the core promise stronger: customers do not need to trust
setup.social’s dashboard to validate a receipt.
You can still keep the hosted implementation closed while making
verification independently possible.
   1. DOC CLAIMS TO CHANGE NOW
Until QP v1 acceptance passes, replace claims such as:
   - “cryptographic proof it worked”
   - “effect gateway is the constitutional boundary”
   - “P0 fixed”
   - “receipts append-only”
with prototype language.
Also correct:
   - “credentials never touch the open internet” -> credentials are never
   exposed to agents/client UI; controlled server sends them only to intended
   provider over authenticated TLS.
   - infrastructure proof is not stronger than email receipt; they are
   different claims.
   - “all socials FREE” and API quotas/pricing should not become
   architectural assumptions; treat provider pricing/limits as external
   mutable data.
   1. DEFINITION OF DONE — QP/1
Do not mark QP/1 complete until ALL are mechanically demonstrated:
BUILD/RELEASE
   - one canonical protected branch
   - clean typecheck
   - all unit/adversarial/integration tests green
   - required CI
   - reproducible/pinned program manifest
   - release/tag identity pinned
AUTHN/AUTHZ
   - every private endpoint authenticated
   - no body/query actor authority
   - no arbitrary long token authentication
   - no public mutation
   - explicit de