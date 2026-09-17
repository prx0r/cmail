Content-Transfer-Encoding: quoted-printable
cmail QP peer review — Part 1/3
Review target:
   - repo: prx0r/cmail
   - branch: master
   - commit: 004035a9d95470496a5d9826354c28d949014907
   - tree: 7e282caf3ae85f063193230070b34970e7fb9eb2
   - previous reviewed baseline: dec850ec405bbd90ad3a2ad6680fcfaa0273a13d
   - delta: 12 commits ahead
I also reviewed monid-ai/monid at 7e3148f5adfde3ebc77745b42ec92fa7e554c924
to assess whether Monid should become the connector substrate beneath QP.
That integration recommendation is in Part 3.
Executive verdict
There is substantial progress in repository shape: a qp/ kernel now exists,
authority/identity modules exist, 13 ProofSpec JSON files exist, an
adversarial-test file exists, a D1 schema exists, an email round-trip probe
exists, and a social executor/YouTube observer prototype exists.
However, *QP is still not the constitutional runtime boundary.* The repo
currently contains a QP prototype beside the old execution system. The live
Worker still allows consequential actions to bypass QP, caller identity is
still self-asserted, the new capacity MCP surfaces manufacture proof-shaped
evidence, and several new QP modules are not even included in TypeScript
compilation.
Do not build more platform adapters until the P0 items below are fixed.
Otherwise every downstream proof will inherit a false root of trust.
Canonical invariant remains:
COGNITION != TRUTH != AUTHORITY
and consequential flow must be:
AUTHENTICATE → build exact proposal → validate prerequisites → validate
exact signed grant → atomically RESERVE grant/budget/idempotency → ACT once
→ independent READBACK → judge TRUE/FALSE/UNKNOWN → replay → signed
append-only settlement receipt
Current master does not enforce that sequence.
P0-1 — /mcp authentication/ADMIN spoof remains unfixed
src/mcp.ts still does:
const { tool, args = {}, actor = "owner" } = body; const perms = await
getPerms(env, actor);
and:
async function getPerms(env: Env, actor: string): Promise<string[]> { if
(actor === "owner") return ["ADMIN"]; ... }
CORS remains Access-Control-Allow-Origin: "*".
Therefore the caller still chooses its own principal. Sending actor:"owner"
yields ADMIN. This is the same critical boundary failure from the first
review.
Consequential routes still execute directly:
   - email.send → SENDER.send(...)
   - name.cf_purchase → cfRegisterDomain(...)
   - name.wire_email → cfWireEmail(...)
   - name.phone_purchase → telnyxPurchaseNumber(...)
They are guarded by caller-controlled confirmed:true / text confirmation,
not authenticated signed QP authority.
Required fix
   1. Authenticate request before dispatch.
   2. Derive principal server-side from credential/session/token. Remove
   body actor as identity source.
   3. No default owner.
   4. Separate public/read-only routes from private routes.
   5. Every money/send/DNS/account-write effect must go through one QP
   effect gateway.
   6. confirmed:true can be UI intent only. It must never equal authority.
   7. Rotate live consequential credentials if this endpoint has ever been
   publicly reachable with them enabled.
This must be fixed first.
P0-2 — QP is still bypassed by the actual effect path
The new kernel exists under qp/, but src/mcp.ts does not route domain
purchase, email send, DNS mutation, or phone purchase through it.
The Worker path is still effectively:
request → mcp switch → confirmed flag → provider API
not:
request → authenticated proposal → QP prerequisite check → grant
validation/reservation → provider effect → independent readback → QP
settlement/replay
The architectural requirement is not “QP tools exist.” It is *there is no
other way to cause a consequential effect*.
Required fix
Create one effect gateway, e.g.:
qp.effects.execute({ principal, proposal, required_claims, grant, adapter,
readback, proofspec, })
and make direct provider mutators private/internal. MCP may create
proposals and submit grants; it must not directly invoke provider mutators.
P0-3 — capacity.list fabricates evidence
The newly added capacity.list route in src/mcp.ts is actively dangerous to
QP semantics.
It constructs:
const evidence = { mx_records: DB domain exists ? ["route1.mx.cloudflare.net"]
: [], spf_record: "v=spf1 include:_spf.mx.cloudflare.net", zone_id:
"check-required", zone_status: "active", routing_rules: 5, catch_all: true,
worker_live: true, mailbox_indexed: ... };
Most of those fields are invented constants, not observations.
This means the system can manufacture:
   - zone active
   - SPF configured
   - five routing rules
   - catch-all enabled
   - worker live
without querying any authoritative source.
This violates the entire QP premise.
Required fix
Delete/quarantine this implementation immediately.
capacity.list should be a *projection of settled receipts*, not a verifier
and certainly not an evidence generator.
Correct behavior:
capacity.list → query canonical qp_claims + latest settled receipts →
return TRUE/FALSE/UNKNOWN + receipt hashes
If no proof exists, return UNKNOWN. Never synthesize missing observations.
P0-4 — capacity.verify is not QP verification
Current route:
const { verify } = await import("./verifiers"); const result =
verify(args.type || "receive_email", args.evidence || "{}");
The caller supplies arbitrary evidence text, which is run through heuristic
src/verifiers.ts functions. There is no:
   - ProofSpec load
   - ContractRoot
   - exact Claim
   - evidence provenance validation
   - program hash verification
   - prerequisite proof check
   - receipt generation
   - replay
   - settlement
This should not be presented as a QP verification endpoint.
Replace it with something like:
qp.probe / qp.resolve
where evidence is collected by registered collectors or explicitly imported
as UNTRUSTED evidence and then evaluated under a frozen ProofSpec.
P0-5 — social executor acts before validating authority
qp/social/executor.ts says the desired architecture correctly in comments,
but socialExecute() currently does:
const execResult = await executor.execute(...)
before any grant validation or reservation.
Its authority argument is merely:
{ grant_id: string; grant_proof: string; }
and the Postiz adapter ignores the proof.
So the new social path currently has the exact ordering QP is supposed to
prevent:
ACT first → maybe read back later Required fix
socialExecute() must not be allowed to call an executor until:
   1. authenticated principal resolved
   2. exact canonical effect payload hashed
   3. required settled facts checked
   4. signed grant verified against issuer trust registry
   5. subject/action/payload/constraints checked
   6. nonce/budget/idempotency reserved durably
Then and only then may it execute.
After execution, readback is mandatory before success settlement.
P0-6 — grant constraints are not actually signed
This is the most important cryptographic bug in the new code.
qp/authority.ts signs:
const canonical = JSON.stringify(grantBody, Object.keys(grantBody).sort());
Passing an array replacer to JSON.stringify filters object keys
recursively. The allowlist contains the TOP-LEVEL keys but not nested
constraint keys such as:
max_amount currency provider resource scopes
Therefore constraints serializes effectively as {} for the signature input.
An attacker could alter the nested constraints without invalidating the
signature.
This invalidates the core authority guarantee.
Required fix
Use one canonical serializer for all QP objects (prefer a tested RFC
8785/JCS implementation or an explicitly frozen equivalent).
Then:
signature = Ed25519.sign(canonicalBytes(fullGrantBody))
Add adversarial tests that modify every nested constraint independently and
require signature failure.
Also fix the rest of authority.ts:
   - validate subject against authenticated executor principal
   - bind issuer ID to trusted public key registry
   - enforce max_amount/provider/resource/scopes
   - use canonical payload hash, not raw JSON.stringify
   - validate issued_at/expires_at as timestamps
   - check consumed/reserved nonce during validation
   - replace in-memory Set with atomic durable reservation
   - define actual max_uses semantics; current nonce model is effectively
   one-use regardless of value
   - do not use ttlSeconds || 3600 / maxUses || 1 because explicit zero is
   silently replaced
P0-7 — old capacity.ts proof path is still broken and incompatible
src/capacity.ts still contains the exact original bug:
const cap = capacities.get(capId); if (!null) return null;
!null === true, so generateProof() always returns null.
Worse, src/verifiers.ts now returns:
{ actuality, reason, evidence_hash }
but capacity.ts still reads:
result.pass
and stores the old boolean CapacityProof model.
This file is now both logically broken and type-incompatible with the newer
Actuality semantics.
Required fix
Do not patch it back into life. Retire the old CapacityProof system
entirely.
Capacity should be a VIEW over canonical QP claims/receipts, not a second
proof engine.
P0-8 — QP code is not included in TypeScript compilation
Current tsconfig.json:
"include": ["src"]
Therefore these new constitutional files are excluded from npm run typecheck
:
qp/** mcp/** proofspecs/**
This is already hiding real mistakes: qp/probes/email-roundtrip.ts
constructs Evidence objects that do not satisfy the declared Evidence
interface.
Required fix
Either move runtime QP code under src/qp/, or change TS project structure
so ALL executable QP/MCP code is compiled in CI.
Suggested:
"include": ["src/**/*.ts", "qp/**/*.ts", "mcp/**/*.ts"]
plus JSON ProofSpec validation in CI.
CI must run, in order:
typecheck unit tests QP adversarial tests ProofSpec schema/registry
validation replay corpus build
No merge if any fail.
P0-9 — QP migration is not on Wrangler’s migration path
wrangler.toml says:
migrations_dir = "migrations"
but new QP schema is at:
qp/migrations/0001_qp_core.sql
Therefore standard Wrangler migration execution will not apply it.
The schema is a useful start, but as currently placed it is not the
deployed constitutional store.
Required fix
Move/merge QP migration into the configured migration directory, then add
an actual QP store layer that is used by the runtime.
Do not call receipts append-only until runtime writes to that store and
updates/deletes are structurally prevented or tightly controlled.
Immediate stop condition
Before touching Instagram/TikTok/X/Postiz/Monid integration, get these
invariants green:
[ ] caller cannot self-assert owner [ ] no effect path bypasses QP [ ] no
QP endpoint fabricates evidence [ ] grant constraints are cryptographically
covered [ ] reserve happens before act [ ] QP code compiles in CI [ ] QP
tables actually deploy [ ] old CapacityProof path is retired
Part 2 covers the proof kernel itself: replay, evidence integrity, judges,
ProofSpecs, email proof, YouTube ownership proof, tests, and the parallel
incompatible mcp/ proof model.

---

Content-Transfer-Encoding: quoted-printable
cmail QP peer review — Part 2/3
This part reviews the QP kernel and whether the new “proofs” are actually
legitimate under the canonical model:
Π_QP = (K, C, E, J, A, G, Λ, R, Σ)
where frozen contract, exact claim, provenance-bearing evidence, pinned
judges, TRUE/FALSE/UNKNOWN actuality, hard gates, independent authority,
transition receipt, and replay are all required.
The short answer: *the new structures point in the right direction, but
current receipts are not yet QP proofs.* Several core fields exist only
nominally; replay does not validate them.
1. qp/kernel.ts: good skeleton, incomplete verifier
Good additions:
   - explicit Actuality = TRUE | FALSE | UNKNOWN
   - AND semantics with FALSE > UNKNOWN > TRUE
   - structured Evidence
   - exact Claim
   - ProofSpec
   - Grant
   - TransitionReceipt
   - receipt hashing
   - Merkle roots
   - independent replayReceipt() concept
Keep this shape.
The problem is what replayReceipt() currently fails to verify.
1.1 Judge hashes are NOT verified
Code explicitly says:
// In production, we'd verify each judge's source hash matches
spec.judges[i].program_hash // For now, verify count matches
A judge count is not program identity.
A malicious/different judge implementation can currently be supplied at
replay time while still satisfying the same ProofSpec.
This breaks J.
Fix
Replay must receive program bundles keyed by immutable bundle hash and
reject unless:
actual source hash == spec program hash runtime hash == pinned runtime hash
dependency hash == pinned dependency hash config hash == pinned config hash
bundle hash recomputes exactly
Do the same for gates.
1.2 actuality_dag is ignored
ProofSpec has:
actuality_dag: string[]
but replay simply computes:
andDag(...judgeResults.map(r => r.actuality))
The declared DAG is not interpreted or checked.
So K does not actually determine actuality semantics.
Fix
Represent an explicit deterministic expression tree/DAG such as:
{ "op": "AND", "children": [ {"judge":"dns_configured"},
{"judge":"route_configured"}, {"judge":"nonce_observed"} ] }
Replay evaluates that exact frozen tree. Reject undeclared/missing/extra
judge nodes.
1.3 Evidence integrity is mostly unchecked
Replay currently checks that provenance fields are present, but not that
they are true or internally consistent.
Missing checks include:
evidence.claim_id == claim.id sha256(response_payload) == response_hash
recompute evidence.id from canonical evidence body normalized payload hash
validity collector program identity allowed by ProofSpec collector runtime
identity provenance signature signer trust provenance_policy_hash semantics
independence_policy_hash semantics schema validation against
evidence_schema_hash
At present an evidence object can claim almost any collector/source and
replay only checks strings exist.
Fix
Evidence must be content-addressed from a canonical evidence body.
Suggested split:
EvidenceEnvelope { claim_id class observed_at source locator
collector_bundle_hash request_hash response_blob_hash normalized_blob_hash
nonce independence_group } EvidenceID = H(canonical(EvidenceEnvelope))
Raw payload remains content-addressed blob storage. Replay fetches exact
bytes and recomputes all hashes.
1.4 Freshness currently fails too open
Current:
const maxAge = spec.freshness[e.class] || 3600;
Unknown evidence classes silently inherit one hour.
Also invalid/future timestamps need explicit rejection/handling; NaN or
negative age must not silently become fresh.
Fix
Unknown evidence class under a ProofSpec = inadmissible.
Parse timestamps strictly. Require:
observed_at <= settled_at + allowed_clock_skew settled_at - observed_at <=
exact frozen max age 1.5 Claim is not fully bound to ContractRoot
Replay verifies receipt ContractRoot and receipt claim ID, but does not
verify:
claim.contract_root == computeContractRoot(spec)
Also makeClaim() hashes only predicate + subject; contract semantics are
not part of the claim ID.
It is reasonable for proposition identity to be independent of proof
method, but then proof identity must explicitly be (claim_id, contract_root)
everywhere. Do not allow the same claim object to carry a mismatched root.
1.6 State transition is not replayed
state_after_root is not recomputed. Replay returns the receipt’s supplied
root.
Likewise it does not verify:
   - proposal root from proposal bytes
   - state_before root against canonical previous state
   - transition program hash against ProofSpec
   - transition function output
   - previous receipt chain
Therefore Σ currently replays judge results, not the actual committed
transition.
Fix
Replay must run a pinned pure transition program:
(state_before, claim, actuality, gates, authority, proposal) -> state_after
and recompute the exact state root.
1.7 QP signature is not verified
Receipt contains:
qp_signer qp_signature
but replay does not verify either.
So an unsigned receipt with empty signature can replay as valid.
Fix
Have a dedicated settlement signing key / KMS identity. Replay verifies
signer against a trusted QP signer registry and verifies signature over
canonical receipt hash/domain-separated bytes.
Do not put this key in the connector/executor runtime.
2. qp/judges.ts — current judges are heuristic probes, not proof-grade
judges
Almost every judge relies on regex/string presence instead of exact typed
claims.
Examples:
judgeDnsValid
TRUE if some evidence contains Cloudflare MX pattern and some evidence
contains v=spf1.
It does not bind exact domain, record owner, authoritative DNS source,
expected record set, or claim ID.
judgeCfZoneActive
TRUE if a Cloudflare-looking response contains:
"status":"active"
It does not prove this is the exact domain/account claimed.
judgeEmailInfrastructure
Uses loose conditions like response containing routing, mailbox, needs_me.
Also the initial filter excludes routing_config, while later code checks
for that class, so direct routing-config evidence can never reach the
condition.
Missing evidence becomes FALSE in several paths where QP semantics require
UNKNOWN.
judgeHandleAvailable
Ambiguous/malformed evidence becomes FALSE. It should usually be UNKNOWN
unless an admissible source gives a decisive taken result.
judgeAccountCreated
Looks for success|created|account_id in a signup response.
That does *not* prove account_owned. Signup acknowledgement is candidate
evidence; ownership requires authenticated readback/challenge.
judgeOAuthAuthorized
Looks for substring access_token.
That does not prove exact principal, scopes, active state, expiration, or
revocation state.
Required approach
Judges should consume normalized typed evidence only, e.g.:
{ provider: "youtube", authenticated_principal: "...", channel_id: "UC...",
scopes: [...], token_status: "active", observed_at: ... }
No regexing arbitrary raw payload as canonical semantics.
Raw payload is provenance evidence; normalized typed projection is what
deterministic judges reason over.
3. ProofSpecs are currently descriptive JSON, not frozen executable
contracts
The 13 new ProofSpecs are useful design docs, but many do not satisfy the
TypeScript ProofSpec interface and their hashes are placeholders.
Example account_owned.v1.json is missing fields required by ProofSpec:
claim_schema_hash evidence_schema_hash actuality_dag provenance_policy_hash
independence_policy_hash transition_program_hash
Its judge is:
judge_account_authenticated
but the current qp/judges.ts does not implement that judge. It implements
judgeAccountCreated, which is a different claim entirely.
oauth_authorized.v1.json similarly references judge_oauth_valid, while
current code exports judgeOAuthAuthorized with different semantics.
domain_available.v1.json is structurally closer, but values such as:
sha256:judgeRegistrarAvailable sha256:domain_available_schema
sha256:standard
are labels, not SHA-256 digests of actual program/schema/policy bytes.
bundle_hash is empty.
Required fix
Do not hand-author hash-shaped strings.
Build a ProofSpec compiler/registry:
source schema + actual judge bundle + actual gate bundle + actual
transition program + provenance policy + independence policy → compute
hashes automatically → emit canonical ProofSpec → compute ContractRoot
CI must reject:
   - missing program
   - unknown program ID
   - empty bundle hash
   - non-hex/placeholder hash
   - ProofSpec missing required fields
   - judge/gate not referenced by actuality DAG
   - unregistered evidence class
The JSON checked into proofspecs/ should ideally be generated canonical
artifacts or validated source specs, not trusted because they contain the
word sha256.
4. qp/probes/email-roundtrip.ts — right idea, broken evidence
implementation
The design is correct:
nonce → external sender → exact mailbox → exact token correlation
But the code currently violates its own Evidence interface.
Evidence requires:
response_payload: string response_hash: string // SHA256 of
response_payload
The roundtrip probe omits response_payload and stores raw JSON inside
response_hash:
response_hash: JSON.stringify({...})
Then judgeNonceObserved() does:
JSON.parse(e.response_hash)
So payload and hash semantics are inverted.
This escaped because qp/** is outside tsconfig.
Other issues:
   - timeout/send failure returns boolean valid:false; target Actuality
   should usually be UNKNOWN absent decisive negative
   - comment says prerequisites dns_configured and email_route_configured
   are required, but function does not verify their settled receipts
   - sender/poll collector authenticity is not established
   - raw message hash is not actually fetched/verified
Required fix
Make probe output evidence only. It should not declare valid.
QP judge decides actuality from:
challenge-issued evidence send evidence exact mailbox receive evidence raw
message bytes/hash prerequisite receipts 5. YouTube prototype contains an
invalid ownership proof
qp/social/youtube.ts is directionally useful because it goes to Google
directly for readback/analytics.
But:
readbackChannel(accessToken, channelId)
calls:
youtube/v3/channels?id=<channelId>&part=statistics
That proves a channel exists. It does *not* prove the supplied credential
controls/owns that channel.
Yet generateChannelReadbackEvidence() labels the result:
claim:account_owned:youtube:<channelId>
This is epistemically invalid.
Correct ownership proof
Use authenticated principal-bound readback, e.g. channels?mine=true, then
reconcile the exact returned channel ID to the claim. Where the API
semantics differ, use an equivalent authenticated challenge/readback.
Other YouTube issues:
   - OAuth evidence trusts a caller-supplied scope list; use provider/token
   introspection or exact authenticated calls
   - evidence IDs depend on video/channel ID, not evidence content; state
   changes reuse the same ID
   - collector hash is hash of literal youtube-adapter, not code bundle
   - runtime hash is literal node:20, not a content identity
   - non-OK readbackVideo returns null, conflating not-found with
   auth/quota/network failures
   - Analytics returns [] on non-OK, conflating real zero rows with failed
   observation
   - raw access/refresh tokens are passed directly; move to
   vault/credential proxy
For QP, failure to observe must become UNKNOWN/error evidence, not
empty-success.
6. qp/social/executor.ts manually fabricates receipt internals
After readback, it constructs a receipt containing:
contract_root: "" claim_id: ad hoc action/id string state_before_root:
hash("state:before") transition_program_hash: hash("social-execute")
prev_receipt_hash: hash("prev") qp_signature: "" qp_signer:
"social-gateway"
Judge/gate roots are also manually formed from strings rather than actual
pinned judge/gate result objects.
That is not settlement.
Required fix
No adapter/gateway may construct a canonical receipt directly.
Only QP settler should be able to produce a TransitionReceipt, after:
ProofSpec resolution claim resolution program bundle resolution judge
execution gate execution authority validation state transition replay

---

Content-Transfer-Encoding: quoted-printable
cmail QP peer review — Part 3/3
This is the implementation order. Do not optimize for more features;
optimize for making one claim/effect path constitutionally real end-to-end.
I also reviewed current open-source Monid:
   - repo: monid-ai/monid
   - commit: 7e3148f5adfde3ebc77745b42ec92fa7e554c924
   - license: MIT
Monid is a strong candidate for the generic connector/compiler/execution
substrate beneath QP, but it must remain outside QP’s trust boundary.
A. Target architecture
The system should converge to:
AGENT / PLANNER │ │ desired state ▼ ┌──────────────────────────┐ │ QP │ │
claims / truth │ │ authority / grants │ │ transition settlement │ │ replay
/ signatures │ └───────────┬──────────────┘ │ approved exact effect ▼
┌──────────────────────────┐ │ CONNECTOR EXECUTION │ │ Monid sealed unit │
│ Postiz where useful │ │ direct provider adapter │
└───────────┬──────────────┘ │ ▼ EXTERNAL WORLD │ │ independent observation
▼ ┌──────────────────────────┐ │ OBSERVATION CONNECTOR │ │ preferably
separate │ │ official API / probe │ └───────────┬──────────────┘ │ evidence
▼ ┌──────────────────────────┐ │ QP JUDGE + SETTLEMENT │ │
TRUE/FALSE/UNKNOWN │ │ replay │ │ signed receipt │
└──────────────────────────┘
Credentials should be injected at the transport/vault boundary and never
exposed to the planner or included in QP receipts.
B. Why Monid is useful
Monid already solves a large amount of generic connector machinery that
cmail should not recreate:
   1. declarative provider + endpoint definitions
   2. schema compilation
   3. deterministic sorting/compilation
   4. content-addressed function sources (fnTable)
   5. sealed endpoint units containing only referenced functions
   6. runtime ABI/version checks
   7. input/output contract validation
   8. credential injection at transport boundary
   9. usage estimation/evidence and credit accounting
   10. fixture record/replay harness
   11. large connector catalog and an agent-friendly connector authoring
   model
Its compiler explicitly normalizes functions, lints them as closed terms,
hashes source, and interns identical code by hash. The engine verifies the
hash before linking.
That maps very naturally into QP program identity.
For a QP effect receipt, pin something like:
executor.kind = "monid" executor.endpoint_id = "youtube#videos/insert"
executor.doc_hash = ... executor.sealed_unit_hash = ...
executor.engine_version = ... executor.bundle_source = exact Monid
commit/build
For observation, pin a separate sealed unit where possible.
C. But Monid is NOT the QP verifier/security sandbox
Important trust-boundary finding from Monid itself:
Its engine reconstructs connector functions with new Function(...).
Monid’s design record explicitly states that closed-term/purity checks are
for determinism/replayability, *not security*; it assumes repo-authored,
PR-reviewed, content-hash-verified function sources.
Therefore:
Monid content hash == code identity Monid content hash != proof of safety
Do not allow arbitrary third-party Monid connector bundles to execute in
the same trust domain as:
   - QP settlement signing key
   - human grant signing key
   - unrestricted credential store
   - canonical QP database admin credentials
Run connector execution in a restricted worker/process/container with least
privilege and constrained egress where practical.
The Monid engine is an executor/collector substrate. QP remains the
authority/truth kernel.
D. Recommended division of responsibility QP owns Claim identity
ContractRoot / ProofSpec Actuality semantics Evidence
admissibility/provenance Independence requirements Prerequisite graph
Human/policy authority Grant validation/reservation Canonical transition
Receipt signing Append-only settlement Independent replay Monid owns Connector
description API input/output schemas Auth injection hook Request
transformation Response transformation Async lifecycle mechanics Connector
program content identity Fixture replay of connector behavior Postiz/social-mcp
may own Platform-specific implementation knowledge OAuth flows
Upload/scheduling quirks Media preparation Provider-specific social
behavior
Port or wrap those behaviors behind connector endpoints rather than making
them canonical state stores.
E. Effect/readback duality should become the core integration pattern
For every consequential connector, define an effect and an independent
observer.
Examples:
youtube.video.insert → youtube.videos.get/list github.repo.create →
github.repo.get cloudflare.dns.create → authoritative DNS + CF readback
telnyx.number.purchase → telnyx.number.get/list instagram.media.publish →
instagram.media.get
An effect endpoint NEVER proves its own target state.
Execution response is evidence class:
effect_acknowledgement
Readback evidence establishes the candidate external state.
This should eventually be compiler-assisted:
EffectSpec { action input_schema target claim prerequisites authority
policy executor bundle idempotency strategy } ProofSpec { claim observer
bundle(s) evidence schema actuality DAG freshness independence policy
judges/gates }
Human reviews semantics once; CI computes hashes and freezes ContractRoot.
F. Exact repair order Phase 0 — stop false guarantees
Before new feature work:
   - mark README QP architecture as TARGET until enforced
   - disable/remove fabricated capacity.list evidence
   - disable direct unauthenticated consequential MCP routes if deployed
   - remove/restrict old mcp/domain.ts simulation from anything
   production-facing
Phase 1 — authenticated principal
Implement real MCP auth.
Output of authentication must be:
Principal { id key/session identity roles/scopes }
No request body can override it.
Phase 2 — one canonical serialization/hash library
Use the same canonical byte representation for:
claims evidence envelopes grants proposals ProofSpecs program manifests
receipts state roots event chain
Never use ad hoc JSON.stringify variants for signed/hash-critical objects.
Phase 3 — repair authority completely
Implement durable grant lifecycle:
ISSUED → RESERVED → CONSUMED
or:
ISSUED → RESERVED → RECONCILIATION_REQUIRED
on ambiguous effect failure.
Atomic reservation before act is mandatory.
Validate:
trusted issuer signature subject == authenticated principal action exact
payload hash provider/resource scope amount/currency expiry/not-before
nonce/use count Phase 4 — make ProofSpec executable
Create a registry/compiler that resolves real schemas/program bundles and
computes every hash automatically.
Reject placeholders such as:
"sha256:judgeFoo" "bundle_hash":""
ContractRoot must be reproducible from actual bytes.
Phase 5 — make replay complete
Replay must verify:
ContractRoot claim-root binding Evidence IDs raw response hashes normalized
hashes collector bundle identities provenance signatures/policies
independence policy freshness judge/gate bundle identities actuality DAG
required gates authority proposal root state_before root transition program
state_after root prev receipt/event chain QP receipt signature
No field in a receipt should be trusted merely because it is inside the
receipt.
Phase 6 — wire persistence for real
Move D1 migration under configured Wrangler migration path.
Implement QPStore used by runtime:
putContract putClaim putEvidence issue/reserve/consumeGrant settleReceipt
appendEvent getLatestClaimState verifyEventChain
Receipt/event insertion should be transactional where possible.
Prevent casual mutation/deletion of settled records.
Phase 7 — prove ONE vertical
Do email first.
Desired chain:
domain_owned(D) dns_configured(D) email_route_configured(A)
email_receives(A)
For email_receives(A):
QP issues random challenge N independent sender sends N to exact A cmail
indexes exact message collector fetches exact mailbox/message/raw bytes
judge binds A + N + sender + timestamps + message ID + raw hash replay
signed settlement
Do not call infra-only checks email_receives.
Phase 8 — one consequential effect end-to-end
Use domain or phone purchase.
Prove:
proposal → signed exact grant → durable reserve → effect adapter → provider
acknowledgement → independent authenticated readback → target claim
TRUE/UNKNOWN/FALSE → canonical transition → replay → signed receipt →
consume/reconcile reservation
Then make the direct old effect path unreachable.
Phase 9 — Monid integration
Only after Phases 1-8 are real, introduce a connector ABI.
Do NOT rewrite Monid.
Start with a minimal wrapper:
interface QPConnectorExecution { endpointId: string; sealedUnitHash:
string; engineVersion: string; inputHash: string; credentialRef: string;
run(): EffectEnvelope; }
Record exact Monid commit/build + sealed-unit identity in evidence/receipt
metadata.
Run Monid outside QP signing trust domain.
Phase 10 — YouTube first social vertical
Claims:
account_owned(youtube, channel_id) oauth_authorized(google, principal,
scopes) can_post(youtube, channel_id) youtube_video_state(video_id,
expected_metadata) youtube_analytics_snapshot(query_hash, period)
For account ownership use authenticated mine=true or equivalent
identity-bound API semantics, not existence lookup by public channel ID.
For post execution:
exact media artifact hash + exact title/description/privacy/etc + signed
grant → executor → returned video ID → independent Google API readback →
exact metadata/channel/status comparison → QP receipt
Analytics is read-only observation. API failure must be UNKNOWN, never []
interpreted as successful zero data.
G. Remove the duplicate proof systems
Current repo has at least three overlapping truth models:
   1. old src/capacity.ts + CapacityProof/pass:boolean
   2. mcp/interface.ts + acom/0.1 QPReceipt/pass:boolean/proof levels
   3. new qp/kernel.ts + qp/1 TransitionReceipt/Actuality
T