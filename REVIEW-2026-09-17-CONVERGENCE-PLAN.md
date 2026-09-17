Content-Transfer-Encoding: quoted-printable
Peer-review follow-up: converge cmail/QP onto existing open-source
infrastructure and preserve only the genuinely unique layer.
Current target
The product is not a scheduler, connector registry, vault, OAuth framework,
workflow engine, or generic signed-receipt protocol. Those layers now have
credible OSS implementations.
QP should converge toward:
   1. exact claim semantics (what does it mean for X to be
   TRUE/FALSE/UNKNOWN?)
   2. effect/readback pairing
   3. independence policy for evidence
   4. ProofSpec registry + frozen ContractRoots
   5. claim dependency/composition
   6. deterministic settlement against evidence
   7. verified spend/outcome composition
   8. replay of QP semantics
Everything else should be imported or wrapped.
============================================================
A. ADOPT NOW — MONID AS CONNECTOR SUBSTRATE
Repo: monid-ai/monid
License: MIT
Current inspected main SHA: 7e3148f5adfde3ebc77745b42ec92fa7e554c924
Monid already provides the parts we should stop inventing:
   - declarative provider/endpoint definitions
   - JSON-schema input validation
   - content-hashed referenced functions
   - sealed execution units
   - credential injection at transport boundary
   - normalized input->request->transport->output pipeline
   - usage/cost settlement hooks
   - fixture recording/replay
   - offline deterministic connector tests
Use Monid as the generic connector compiler/runtime beneath QP.
Do NOT make Monid authoritative for truth. Monid is an I/O engine.
Desired boundary:
QP
-> selects exact frozen Monid effect bundle
-> authorizes exact payload
-> Monid executes
-> raw effect evidence stored
-> separate Monid observation bundle performs readback
-> QP evaluates ProofSpec
-> QP settles claim
Required QP receipt/proof metadata should include at least:
   - effect connector bundle hash
   - observation connector bundle hash
   - input canonical hash
   - raw response hash
   - normalized response hash
   - Monid engine/runtime identity
   - credential reference/version, never secret value
Do not fork Monid deeply into cmail. Integrate behind a narrow adapter
interface and pin exact commits/bundle hashes.
Create:
integrations/monid/
client.ts
types.ts
identity.ts
README.md
Suggested interface:
interface ConnectorExecution {
bundleHash: string;
provider: string;
endpoint: string;
inputHash: string;
requestHash: string;
rawResponseHash: string;
normalizedResponseHash: string;
output: unknown;
observedAt: string;
}
Effect executors and observation probes may both use Monid, but QP must
require independent bundles/independence groups where the ProofSpec
requires independent readback.
============================================================
B. ADOPT NOW — INFISICAL AGENT VAULT FOR CREDENTIALS
Repo: Infisical/agent-vault
Core license: MIT (enterprise directory excluded under its own license)
Agent Vault already solves the problem we should not rebuild:
   - agents never possess credentials
   - HTTP/HTTPS proxy injects credentials on outbound requests
   - service/host/path egress rules
   - short-lived agent/vault-scoped sessions
   - request logging
   - pluggable secret stores
   - SQLite/Postgres persistence
   - TS SDK for session/proxy setup
Delete the idea of building our own generic secret broker.
QP owns whether an operation is authorized.
Agent Vault owns whether the caller can physically access/use a credential.
Provider OAuth owns what the upstream account granted.
Those are three different layers.
QP should store only:
credential_ref = vault://tenant/account/youtube
credential_version/hash = …
Never persist raw OAuth/API tokens into QP evidence or receipts.
Integration rules:
   - strict-deny unmatched hosts in production
   - separate Agent Vault host/network from untrusted agent execution
   - give QP/connector runtime short-lived scoped vault sessions
   - service rule must restrict exact provider host/path where feasible
   - QP grant does NOT equal vault session; both must pass
   - vault request log may be evidence, but never sufficient world-state
   proof
Create:
integrations/vault/
agent-vault.ts
policy.ts
types.ts
Do not implement AES secret storage/token proxying ourselves.
============================================================
C. ADOPT NOW — AGENT RECEIPTS / OBSIGNA FOR RECEIPT ENVELOPE
Repo: agent-receipts/obsigna
Code license: Apache-2.0
Protocol spec: MIT
Current protocol: Agent Receipt Protocol v0.5.0 draft
This is the biggest deletion opportunity.
Obsigna already implements:
   - W3C VC-style receipt envelope
   - RFC 8785 canonical JSON
   - Ed25519 signatures
   - SHA-256 parameter hashing
   - hash-chained receipts
   - out-of-process signing daemon/key custody
   - MCP proxy
   - TypeScript/Go/Python SDKs
   - cross-language conformance vectors
   - MUST-reject corpus
   - local verification CLI
   - audit dashboard
Therefore: STOP building a competing generic receipt/signature/chaining
format unless QP requires a semantic field the Agent Receipt extension
mechanism cannot represent.
QP should become a domain-specific proof extension carried inside/alongside
an Agent Receipt.
Design a QP extension context/schema containing:
   - qp.contract_root
   - qp.claim_id
   - qp.actuality TRUE|FALSE|UNKNOWN
   - qp.evidence_root
   - qp.judge_results_root
   - qp.gate_results_root
   - qp.effect_bundle_hash
   - qp.observer_bundle_hash
   - qp.independence_policy_hash
   - qp.authority_ref
   - qp.state_before_root
   - qp.state_after_root
   - qp.replay_result
Use Obsigna/Agent Receipts for:
   - canonical envelope
   - signer/key custody
   - chain linkage
   - portable verification
   - generic action taxonomy/risk fields
QP remains responsible for proving the external claim under frozen
semantics.
Important distinction:
Agent Receipt = cryptographically proves the audit record has integrity.
QP = determines whether the external-world claim is justified.
Do not conflate them.
============================================================
D. DO NOT COPY POSTIZ INTO CLOSED CORE
Repo: gitroomhq/postiz-app
License: AGPL-3.0
Postiz already provides huge social execution coverage, API/CLI/MCP,
scheduling, OAuth flows, media handling and platform-specific settings.
Use it as an UNMODIFIED/SEPARATE NETWORK SIDECAR where useful.
Do not copy AGPL implementation files into closed QP core.
Do not make Postiz’s success response proof.
Boundary:
QP -> HTTP -> Postiz -> platform
platform -> separate official readback -> QP
Postiz is replaceable execution infrastructure.
If we modify and expose an AGPL Postiz deployment over a network, comply
with AGPL source obligations. Prefer an unmodified service boundary and
keep QP independent.
============================================================
E. IMMEDIATE DELETIONS / DEMOTIONS
Do NOT spend more time implementing:
   - generic credential encryption/vault
   - generic OAuth-token secret storage
   - generic signed receipt format
   - generic Ed25519 receipt chain
   - generic connector compiler
   - generic API request transformation engine
   - generic scheduler
   - generic queue/retry dashboard
   - generic social posting adapters where existing code is reusable
Before adding any new infrastructure primitive, search OSS first and record
why existing projects fail our requirement.
The unique work is ProofSpecs + independent evidence + settlement, not
plumbing.
Part 2 will cover social adapters, authority and durable workflows, plus
exactly what to port versus wrap.

---

Content-Transfer-Encoding: quoted-printable
Continuation 2/3.
============================================================
F. SOCIAL EXECUTION — REUSE, DO NOT REBUILD
   1. social-mcp
   Repo: IhsanKabir/social-mcp
   License: MIT
Useful because it is small and already has official-API implementations for:
   - YouTube publish + comments + analytics
   - Facebook Pages
   - Instagram
   - Threads
   - LinkedIn
   - OAuth setup/token refresh
   - account capability model
   - local queue/dead-letter patterns
Important caveat: very young/small repo. Treat as CODE DONOR / REFERENCE,
not trusted infrastructure.
Do this:
   - inspect provider modules
   - extract official request/response knowledge
   - port useful provider calls into Monid connector definitions
   - preserve upstream attribution/license
   - write our own QP ProofSpecs/readback semantics around them
   - verify behavior against official APIs and recorded fixtures
Do NOT adopt its encrypted-token store or scheduler as canonical
infrastructure; Agent Vault and durable workflow tooling cover those jobs
better.
   1.
   Postiz
   Use as broad execution fallback/sidecar for platforms where it has
   mature provider support and where direct Monid connector coverage is not
   ready.
   2.
   Official platform APIs
   Authoritative readback should prefer official provider APIs even if
   Postiz performed the mutation.
Execution and observation should be independently identified:
Effect:
postiz.youtube.publish OR monid.youtube.video.insert
Readback:
monid.youtube.videos.list
Effect:
postiz.instagram.publish
Readback:
monid.meta.instagram.media.read
Effect:
postiz.tiktok.publish
Readback:
monid.tiktok.publish.status / content lookup
Do not make the same opaque adapter both mutate and declare success.
============================================================
G. AUTHORITY — USE GRANTEX AS A REFERENCE/SDK LAYER, NOT OUR OWN CRYPTO
EXPERIMENT
Repo: mishrasanjeev/grantex
License: Apache-2.0
Grantex already provides:
   - cryptographic agent identity
   - scoped/time-limited/revocable authority
   - delegation chains
   - service-side verification
   - audit records
   - TypeScript SDK
   - MCP auth integration
   - multi-agent scope subset enforcement
We should not keep designing generic delegated-agent authorization from
scratch.
However, do NOT blindly drop its MCP auth server into production yet: its
current published MCP Auth package documents limitations around in-memory
authorization codes, consent rendering and code handoff.
Recommended path:
   1. Keep QP’s semantic requirement that consequential actions need exact
   bounded authority.
   2. Add an AuthorityProvider interface.
   3. Implement a Grantex-backed provider using its SDK/protocol.
   4. Map QP action/payload constraints into a cryptographically-bound
   authorization object.
   5. Keep QP-specific validation for exact payload hash,
   amount/provider/resource constraints and one-shot effect identity where
   Grantex’s generic token does not directly express them.
   6. Remove duplicate key generation/signature machinery from QP only
   after equivalence tests pass.
Suggested interface:
interface AuthorityDecision {
principal: string;
agent: string;
action: string;
payloadHash: string;
constraintsHash: string;
authorizationRef: string;
issuedAt: string;
expiresAt: string;
valid: boolean;
}
QP receives AuthorityDecision. It does not invent authority from
confirmed:true.
The human approval UI should create/approve an authorization object. The
execution path consumes it. The execution path must never mint its own
owner grant.
============================================================
H. AGENT IDENTITY — DO NOT BUILD A SECOND IAM PRODUCT
OpenA2A AIM and Alibaba Open Agent Auth both now cover agent
identity/capability authorization/audit patterns. Open Agent Auth is
heavier Java/Spring infrastructure; AIM is Apache-2.0 and closer to an SDK.
Do NOT integrate another IAM stack into the MVP yet.
Decision:
   - Use Grantex as the first authority abstraction because it is
   TypeScript-friendly and directly aimed at delegated agent authority.
   - Keep QP’s identity fields URI/DID-compatible.
   - Do not build our own DID lifecycle, agent PKI, workload identity
   server, OIDC provider or policy language.
   - Re-evaluate AIM/Open Agent Auth once enterprise multi-tenant identity
   is a real customer requirement.
============================================================
I. DURABLE WORKFLOWS — USE TRIGGER.DEV WHEN WE NEED LONG-LIVED
RECONCILIATION
Repo: triggerdotdev/trigger.dev
License: Apache-2.0
It already provides:
   - long-running tasks
   - durable retries
   - queues/concurrency
   - idempotency
   - checkpointing/versioning
   - waits
   - human-in-the-loop waitpoints
   - realtime run state
   - replay/cancel
   - observability
We should NOT build a generic durable workflow engine.
But do not integrate Trigger.dev before the first end-to-end QP effect is
correct.
Use it when we need flows such as:
publish
-> provider says processing
-> wait 30 sec
-> readback UNKNOWN
-> wait
-> retry observation
-> terminal TRUE/FALSE/timeout
-> settle or alert
or:
purchase proposal
-> human approval waitpoint
-> execute once
-> provider ambiguity
-> reconciliation retry for 30 min
-> final settlement
QP remains the state/claim authority. Trigger run state is operational
state only.
Never let trigger run succeeded settle a QP claim.
============================================================
J. TREG / OPEN AGENT AUTH / TEMPORAL — STUDY, DON’T ADD YET
Treg is useful as product/reference architecture for tool catalogs,
server-side credential injection and metered calls, but Monid + Agent Vault
already cover the parts we need with cleaner licensing/abstraction for our
current system. Do not add another registry/proxy dependency now.
Open Agent Auth is excellent enterprise reference material but is
Java/Spring-heavy and duplicates Grantex/AIM territory. Do not pull it into
cmail MVP.
Temporal is proven durable orchestration and Postiz already uses it, but
adding a second large orchestration substrate before we need it creates
operational weight. Trigger.dev is a simpler TypeScript-facing first choice
for our own reconciliation flows. If scale/reliability later requires
Temporal, swap the workflow adapter.
============================================================
K. NEW SYSTEM BOUNDARIES
Target architecture:
AGENT / MCP CALLER
|
v
QP REQUEST COMPILER
   - exact desired claim
   - exact effect proposal
   |
   ±-> AUTHORITY PROVIDER (Grantex-compatible)
   |
   v
   QP EFFECT POLICY
   - prerequisites TRUE
   - authority valid
   - budget/payload constraints
   |
   v
   CONNECTOR RUNTIME (Monid)
   |
   v
   AGENT VAULT PROXY
   |
   v
   EXTERNAL PROVIDER
   |
   v
   INDEPENDENT OBSERVER (Monid official API connector)
   |
   v
   QP PROOFSPEC
   - provenance
   - identity binding
   - freshness
   - independence
   - judges/gates
   - TRUE/FALSE/UNKNOWN
   |
   v
   AGENT RECEIPT / OBSIGNA
   - portable signed envelope
   - chained audit record
   |
   v
   CANONICAL QP STATE
Operational retries around the effect/readback loop may later be
Trigger.dev.
============================================================
L. THE RULE FOR ADDING A NEW PLATFORM
Do not write a platform integration from scratch until these searches fail:
   1. Does Monid already have the endpoint?
   2. Does Postiz already execute it?
   3. Does social-mcp contain an official-API implementation we can port?
   4. Is there an official OpenAPI/spec/SDK we can compile into a Monid
   connector?
Our work for a platform should ideally be only:
   - effect connector identity
   - readback connector identity
   - claim schema
   - ProofSpec/judges
   - independence policy
   - authority requirements
   - adversarial fixtures
That is where QP’s product value lives.
Part 3 gives the exact refactor/build sequence and acceptance tests.

---

Content-Transfer-Encoding: quoted-printable
Continuation 3/3.
============================================================
M. EXACT REFACTOR SEQUENCE
Do this in order. Do not parallelize architectural changes until each
boundary has a passing adversarial test.
PHASE 0 — STOP CLAIMING COMMODITY LAYERS AS PRODUCT
Update docs/product language:
   - remove claims that QP’s uniqueness is Ed25519 receipts, hash chains,
   vaults, OAuth, schedulers or generic agent authorization
   - explicitly position those as replaceable dependencies
   - state that QP’s unique layer is external-state claim semantics +
   independent verification + deterministic settlement
Product invariant:
Agent says it acted
!= executor says success
!= signed audit record exists
!= external claim is TRUE
QP exists for the last step.
PHASE 1 — MAKE THE CURRENT QP PATH ACTUALLY CONSTITUTIONAL
Before integrations, close the current STOP-SHIP findings from the latest
peer review:
   1. No effect handler may issue its own human/owner grant.
   2. email.send, wire_email, phone_purchase and every other mutator must
   route through the effect gateway.
   3. required_claims must actually be loaded and checked as settled TRUE
   under the required ContractRoot.
   4. readback.exists must never directly mint TRUE.
   5. gateway must execute the frozen ProofSpec judges/gates.
   6. receipts must have non-empty ContractRoot, exact claim_id, real
   previous-state/previous-receipt roots, signer and signature.
   7. domain ownership readback must prove ownership in the expected
   Cloudflare account; registrable:false is not ownership.
   8. email infrastructure claims and email_receives round-trip claim
   remain separate.
   9. move QP migration into the migration path wrangler actually runs.
   10. include QP code/tests in typecheck/CI.
   11. remove/kill legacy acom/0.1 and pass:boolean proof paths.
   12. fix src/capacity.ts unconditional-null bug or delete that legacy
   path entirely.
Do not start Monid integration until one real domain or harmless test
effect passes the full invariant.
PHASE 2 — ADOPT AGENT RECEIPTS ENVELOPE
Goal: remove custom receipt cryptographic plumbing from the critical path.
Tasks:
   1. Add @obsigna/sdk-ts or integrate the out-of-process daemon.
   2. Create QP extension schema/context.
   3. Map current TransitionReceipt fields to Agent Receipt + QP extension.
   4. Make QP signer external to the untrusted executor process where
   practical.
   5. Run Agent Receipts cross-language/conformance verification against
   emitted receipts.
   6. Preserve QP replay as a semantic replay step distinct from receipt
   signature verification.
Acceptance:
   - Obsigna verifier accepts canonical QP action receipt.
   - Mutating any signed QP extension field breaks receipt verification.
   - Valid signed receipt with false QP evidence still fails QP semantic
   replay.
That third test is crucial: signed != true.
PHASE 3 — ADOPT AGENT VAULT
Goal: agent/QP planner never possesses upstream credentials.
Tasks:
   1. Deploy Agent Vault separately in local dev.
   2. Add strict service rules for one provider first (YouTube or
   Cloudflare test credential).
   3. Replace direct env-secret reads in the connector path with
   short-lived vault-scoped session/proxy use.
   4. Store credential_ref/version in evidence, not secret.
   5. Add deny tests for non-approved host/path.
   6. Ensure logs redact credentials.
Acceptance:
   - connector succeeds without raw provider token in its process env/config
   - agent cannot ask vault to disclose raw credential
   - connector cannot use credential on unrelated host/path
   - QP receipt contains no token material
PHASE 4 — MONID CONNECTOR SPIKE
Do not port the whole social product first.
Implement exactly TWO connectors:
A. harmless/read-only observer
youtube.videos.list OR Cloudflare domain/account read
B. one effect with clean readback
ideally a low-risk reversible test resource, or use a mocked provider
fixture until safe
Wrap Monid behind ConnectorRuntime so QP is not coupled to its internal
APIs.
Store exact Monid bundle hash in QP evidence/receipt.
Acceptance:
   - changing connector source changes bundle hash
   - replay fixture reproduces normalized output offline
   - QP rejects evidence whose claimed bundle hash does not match frozen
   ProofSpec
   - effect connector’s own success cannot satisfy the observer claim
PHASE 5 — SOCIAL VERTICAL: YOUTUBE FIRST
Why YouTube first:
   - official APIs are comparatively structured
   - social-mcp already contains publishing/analytics code to inspect
   - Postiz already contains mature provider behavior
   - QP can independently read video/channel state
   - content has stable platform IDs and rich readback fields
Target claims:
youtube.account_owned(channel_id)
youtube.oauth_authorized(principal, scopes)
youtube.can_post(channel_id)
youtube.video_exists(video_id)
youtube.video_bound_to_channel(video_id, channel_id)
youtube.video_metadata(video_id, metadata_hash)
youtube.video_visibility(video_id, expected_visibility)
youtube.video_processing_complete(video_id)
Composite:
youtube.video_published_exact(…)
Execution backend preference:
   1. direct Monid official connector if ready
   2. Postiz sidecar
Readback preference:
   1. separate official YouTube Data API Monid connector
Never use Postiz’s response as final evidence for exact publication truth.
PHASE 6 — GENERATE PROOFSPEC SKELETONS FROM CONNECTOR PAIRS
Build the useful automation:
Input:
effect endpoint schema
observer endpoint schema
Output candidate:
EffectSpec
Claim schema
ProofSpec skeleton
identity-binding fields
candidate equality/projection rules
freshness suggestion
independence requirement
authority requirement
adversarial fixture checklist
Human must review/freeze semantics before ContractRoot creation.
This is a genuinely valuable QP developer primitive because it converts
commodity APIs into verified capabilities.
PHASE 7 — AUTHORITY PROVIDER ABSTRACTION
Create:
authority/
provider.ts
grantex.ts
local-test.ts
Do not replace QP’s current grant implementation until tests demonstrate
equivalent/better binding.
Required tests for Grantex-backed path:
   - wrong principal denied
   - wrong agent denied
   - wrong action denied
   - payload mutation denied
   - expired/revoked authority denied
   - child delegation broader than parent denied
   - price over approved bound denied
   - replay/idempotency violation denied
If Grantex cannot express exact payload/amount constraints directly, put a
QP constraint object hash into the grant’s signed/custom claims and verify
it at effect time.
PHASE 8 — DURABLE RECONCILIATION
Only now integrate Trigger.dev.
Wrap it as operational infrastructure:
interface ReconciliationScheduler {
schedule(claimId, attempt, nextAt): Promise
cancel(claimId): Promise
}
QP owns terminal truth. Trigger owns retry timing.
Use for:
   - YouTube processing completion polling
   - ambiguous API outcomes
   - delayed publication
   - eventual consistency
   - human approval waits
============================================================
N. REPO ORGANIZATION AFTER CONVERGENCE
Suggested:
src/
qp/
claims/
proofspecs/
settlement/
replay/
composition/
registry/
integrations/
monid/
agent-receipts/
agent-vault/
authority/
postiz/
trigger/
verticals/
youtube/
claims.ts
proofspecs.ts
mappings.ts
tests/
cloudflare/
email/
Do not put third-party semantics inside qp/kernel.ts.
Kernel should know interfaces, hashes and deterministic semantics—not how
YouTube, Postiz or Vault work.
============================================================
O. WHAT WE ACTUALLY OWN / SELL
After this convergence the proprietary/high-value surface is intentionally
SMALL:
   1.
   ProofSpec registry
   A growing catalog of exact definitions for proving external states.
   2.
   Effect/readback mapping
   Knowledge of which independent observation establishes which claim after
   which effect.
   3.
   Claim composition
   How lower-level proven states compose into business outcomes.
Example:
video_published_exact
= account_owned
AND oauth_authorized
AND video_exists
AND channel_binding
AND artifact/metadata binding
AND visibility
AND processing_complete
   1.
   Independence semantics
   Which evidence channels are sufficiently independent for a claim.
   2.
   Verified spend
   Binding authorization + provider charge evidence + achieved external
   result.
   3.
   ProofSpec compiler/tooling
   Turning commodity connector definitions into candidate verifiable
   capabilities.
   4.
   Reconciliation semantics
   Correct handling when an effect may have occurred but readback is
   temporarily UNKNOWN.
Everything else is replaceable commodity plumbing.
============================================================
P. MVP THAT PROVES THE PRODUCT
Do NOT build Instagram/TikTok/X simultaneously.
The first product demo should be:
“Publish this exact video to this exact YouTube channel under this exact
policy and return a portable proof.”
Input:
   - artifact hash
   - channel ID
   - metadata hash/title
   - visibility
   - max spend
   - authority
System:
   - authority verified
   - credential brokered without exposure
   - executor performs upload
   - official observer independently reads state
   - QP evaluates frozen ProofSpec
   - Obsigna signs portable receipt
   - reconciliation handles processing delays
Output:
   - TRUE/FALSE/UNKNOWN
   - platform ID/permalink
   - exact fields proven
   - cost observed
   - QP ContractRoot
   - evidence root
   - portable Agent Receipt
   - semantic replay PASS
If this single path is cryptographically and semantically correct, the
platform expansion is mostly adapter/ProofSpec work.
============================================================
Q. DEFINITION OF DONE FOR THE CONVERGENCE
Do not mark this work complete until all are true:
[ ] QP no longer invents its own generic receipt crypto where Obsigna
covers it
[ ] emitted QP receipt passes Agent Receipts conformance verification
[ ] QP semantic replay remains separately required
[ ] raw provider secrets never enter the agent/planner process
[ ] Agent Vault strict egress policy is tested
[ ] one Monid connector bundle is pinned/content-addressed in a real proof
[ ] changing connector implementation invalidates old frozen identity
[ ] Postiz is isolated behind HTTP as an untrusted executor
[ ] one official independent readback exists for the same effect
[ ] executor success alone cannot make claim TRUE
[ ] one YouTube exact-publication composite ProofSpec works end-to-end
[ ] every consequential path requires externally issued authority
[ ] no handler self-mints owner/human authority
[ ] no confirmed:true boolean is treated as authority
[ ] legacy pass:boolean / acom proof system removed from production path
[ ] durable retry status cannot settle world truth
[ ] all imported dependencies are pinned and their licenses recorded
[ ] each third-party integration can be replaced behind an interface
without changing ProofSpec semantics
FINAL DESIGN PRINCIPLE
Use open source for HOW to call, authenticate, queue, sign and transport.
QP owns WHAT must be true before we are willing to say an autonomous action
succeeded.
That is the product boundary. Optimize ruthlessly around it.