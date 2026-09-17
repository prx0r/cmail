# QP Dev Plan — Continuation (§11–25)

Content-Transfer-Encoding: quoted-printable
11. Exact cmail ProofSpecs
Implement these first. These are the root proofs from which setup.social
can safely expand.
P1 =E2=80=94 domain_available(provider, domain)
Claim: exact registrar/provider currently reports exact domain D as
registrable under requested product/tier.
Evidence: authenticated registrar availability read; exact domain;
provider/account context; price/currency/tier if returned; observation
timestamp.
TRUE: provider explicitly reports exact D available/registrable and
evidence is fresh.
FALSE: provider explicitly reports exact D taken/not registrable.
UNKNOWN: timeout, auth error, malformed/ambiguous response, unsupported
TLD, rate limit, missing credentials.
DNS NXDOMAIN is never sufficient for TRUE.
P2 =E2=80=94 domain_owned(provider, account, domain)
Claim: D is an owned/managed registration in expected registrar account A.
Evidence: authenticated post-effect registrar list/read; exact domain;
expected account; provider registration ID/state.
TRUE: readback returns D in A with acceptable active/registered state.
FALSE: authoritative readback decisively contradicts ownership under frozen
semantics.
UNKNOWN: API unavailable, auth failure, eventual consistency, ambiguous
state.
Purchase requires signed one-shot authority bound to exact purchase
payload. Provider POST success alone does not settle domain_owned.
P3 =E2=80=94 dns_configured(domain, expected_config)
Claim: authoritative DNS for D matches frozen expected config C.
Evidence: provider config readback + independent authoritative DNS queries
+ expected record-set hash.
TRUE only when all required records exactly match.
FALSE only when authoritative answers decisively contradict after
propagation policy permits a decision.
UNKNOWN during propagation, SERVFAIL, timeout, provider outage, etc.
Do not conflate DNS configuration with ownership.
P4 =E2=80=94 email_route_configured(address, worker)
Claim: exact address A is covered by an enabled routing rule whose action
targets expected worker W.
Evidence: authenticated Cloudflare routing-rule readback including matcher,
enabled state, action target.
TRUE only if matcher + enabled + exact worker action all match.
Current shell verification is insufficient if it only proves routing exists=
.
P5 =E2=80=94 email_receives(address)
Canonical inbound-mail proof.
Claim: exact A can receive a fresh externally-originated message through
the production route and expose it to cmail.
Evidence requirements:
   1. dns_configured and email_route_configured are TRUE.
   2. QP generates cryptographically random nonce N.
   3. Independent sender sends N to exact A.
   4. cmail receives/indexes message.
   5. Probe queries exact mailbox A, never global token search.
   6. Evidence binds A, N, sender, provider/raw message ID, timestamps and
   raw-message hash.
TRUE: N is observed in exact mailbox A within frozen timing/freshness
bounds.
FALSE: only a decisive bounded negative defined by ProofSpec, e.g.
authenticated terminal bounce if the spec accepts that as falsifying.
UNKNOWN: timeout without decisive negative, sender failure, probe failure,
outage, ambiguity.
Infrastructure-only checks can establish CONFIGURED/DEGRADED, not
email_receives=3DTRUE.
P6 =E2=80=94 phone_owned(provider, account, number)
Claim: exact phone N is provisioned in expected provider account A and
acceptable active state.
Evidence: authenticated Telnyx read/list after purchase; exact number;
resource ID; account identity; status.
TRUE only from provider readback. A string beginning with =E2=80=98+=E2=80=
=99 proves
nothing.
Purchase authority must bind exact number/provider/connection ID/max cost.
P7 =E2=80=94 sms_receives(number)
Claim: exact N receives fresh inbound SMS through production webhook/store
path.
Evidence: QP nonce; independent sender to target N; provider inbound event
ID; durable store readback keyed to exact destination number.
TRUE when nonce observed for exact N within timeout.
Do not use process-local in-memory maps as canonical evidence.
P8 =E2=80=94 handle_available(platform, handle)
Claim: at T, supported platform-specific probe indicates H is
unassigned/available under frozen semantics.
TRUE: fresh admissible evidence says available.
FALSE: admissible evidence says taken.
UNKNOWN: captcha, rate limit, wall, no signal, ambiguous response, probe
error.
This is never ownership.
P9 =E2=80=94 account_owned(platform, account_id)
Claim: controlled credential principal authenticates as exact platform
account ID.
Preferred evidence: authenticated provider me/account endpoint returning
exact ID plus credential/principal binding hash.
TRUE only when authenticated provider evidence binds controlled credential
to exact account ID.
Signup UI completion alone is not proof.
P10 =E2=80=94 handle_bound(platform, account_id, handle)
Claim: owned account ID is currently bound to exact handle H.
Prerequisite: account_owned(platform, account_id)=3DTRUE.
Evidence: authenticated account profile readback plus public profile
reconciliation where useful.
TRUE only when exact account ID and exact handle reconcile.
This replaces current broken available OR owned semantics.
P11 =E2=80=94 oauth_authorized(provider, principal, scope_set)
Claim: controlled principal has an active authorization containing at least
exact required scope set S.
Evidence: provider token introspection or authenticated test calls;
credential stays secret; evidence stores credential reference/hash,
normalized scopes, expiry/revocation info if available.
TRUE only when provider evidence proves required scopes.
Consent-page success text alone is not proof.
P12 =E2=80=94 can_post(platform, account_id)
Claim: current controlled authorization for account ID permits the frozen
write-operation class.
Preferred proof:
   - account_owned=3DTRUE
   - oauth_authorized(required write scopes)=3DTRUE
   - provider permission/readback endpoint where available
   - optional harmless/private canary only if necessary
Any write canary is consequential and requires authority. Do not post
publicly merely to prove capability.
P13 =E2=80=94 email_send_accepted / email_delivered
Split these.
email_send_accepted(message): provider/SENDER accepted exact payload and
returned canonical provider ID.
email_delivered(message): independent downstream
receipt/bounce/controlled-inbox readback proves delivery according to
frozen semantics.
message_id plus not failed does not prove delivery.
Sending requires signed exact-payload authority.
12. Replace GRANT graph with typed edges
Use:
REQUIRES | DERIVES | ENABLES | AUTHORIZES | EFFECTS | VERIFIES
Examples:
domain_owned(D) ENABLES configure_dns(D)
email_receives(A) ENABLES signup(platform,A)
signed Grant AUTHORIZES cf.domain.register(payload_hash)
provider effect EFFECTS candidate world transition
readback evidence VERIFIES target claim
Facts make work eligible. Grants authorize effects. Never merge them.
13. Runtime enforcement
Create one QP effect gateway, e.g.
await qp.effects.execute({ proposal, required_claims, grant_id, adapter,
readback_probe, target_proofspec, });
Direct consequential provider functions become private adapters and must
not be reachable from raw MCP dispatch:
   - cfRegisterDomain
   - cfWireEmail
   - telnyxPurchaseNumber
   - email.send
   - social/account mutation
   - OAuth write/credential changes
   - posting
MCP creates proposals or submits authority. QP decides whether execution is
permitted.
14. Fix authentication/authority first
Current /mcp must not trust caller-supplied actor or default owner/admin.
Required:
   1. Authenticate every non-public request with real
   credential/session/token.
   2. Derive principal server-side.
   3. Remove default owner authority.
   4. Split public read-only tools from private tools.
   5. Money/send/DNS/account writes require authenticated principal + valid
   signed QP grant.
   6. Rate-limit and audit rejected identity/grant attempts.
   7. Rotate consequential secrets if exposed behind unauthenticated routes=
.
15. Persistence
Implement real QP tables, not doc-only schema:
qp_contracts(contract_root PK, spec_id, canonical_json, created_at)
qp_claims(claim_id PK, contract_root, canonical_json, created_at)
qp_evidence(evidence_id PK, claim_id, class, observed_at,
independence_group, metadata_json, blob_hash) qp_grants(grant_id PK,
issuer, subject, action, payload_hash, constraints_json, issued_at,
expires_at, nonce, max_uses, uses, signature, status)
qp_receipts(receipt_hash PK, claim_id, contract_root, state_before_root,
state_after_root, actuality, evidence_root, gates_root, authority_id,
prev_receipt_hash, settled_at, signer, signature, canonical_json)
qp_events(seq PK, event_hash UNIQUE, prev_event_hash, type, object_hash,
canonical_json, created_at)
Large/raw evidence goes to content-addressed blob storage; D1 stores
immutable metadata/hashes.
16. Tasks/missions become projections
Task completion may record worker progress, not world truth.
BAD:
task.status=3Ddone -> downstream unlocked
GOOD:
settled claim domain_owned(D)=3DTRUE under required ContractRoot ->
downstream eligible
Mission completion must be a query over required settled claims, not task
booleans.
17. Target JSON is plan/config, never proof law
targets/*.json may describe desired target, dependencies, adapters, docs,
cost hints, escalation.
It may not define trusted semantics by inventing gate strings.
Reference immutable registered ProofSpecs:
proofspec:account_owned:youtube@sha256:=E2=80=A6
proofspec:handle_bound:youtube@sha256:=E2=80=A6
Unknown roots fail closed. Validate JSON against runtime schema.
18. Explicit current fixes
   1. Fix capacity.ts if (!null) return null;.
   2. Delete verifier semantics where available proves ownership.
   3. Delete phone verifier where any +number proves ownership.
   4. Split email accepted vs delivered.
   5. Separate domain ownership from DNS/email configuration.
   6. Infrastructure checks must not call themselves CERTIFIED without
   roundtrip.
   7. Routing proof must bind matcher + enabled + exact worker.
   8. Email roundtrip must query exact mailbox.
   9. Move SMS evidence to durable storage.
   10. Force MCP through QP.
   11. Implement the QP D1 schema for real.
   12. Implement independent replay.
   13. Add adversarial tests for QP.
   14. Pin exact commit/tree/program hashes, never branch names.

---

Content-Transfer-Encoding: quoted-printable
19. Source/build identity
For every QP program/probe/adapter record:
   - git repository
   - commit SHA
   - tree SHA
   - build hash
   - program bundle hash
   - runtime/dependency lock hash
   - deployment identifier
Never use master/main/latest/mutable tags inside proof roots.
20. Security boundary
Keep the trusted base small:
TrustBase =3D canonical hashing + QP verifier/settler + signature
verification + tiny probe/effect runtime + immutable program bundles
LLMs, planners, browser automation, provider adapters, target JSON, task
orchestration and UI are outside the constitutional trust base.
Workers propose.
Probes observe.
Judges judge.
QP commits.
No self-promotion.
21. Required adversarial tests
Truth semantics:
   - missing evidence =3D> UNKNOWN
   - malformed evidence =3D> UNKNOWN unless explicitly falsifying
   - any FALSE required leaf dominates an AND-DAG
   - any UNKNOWN required leaf blocks TRUE
   - all required TRUE =3D> TRUE
   - stale evidence =3D> UNKNOWN/rejected
Claim identity:
   - mailbox B evidence cannot prove mailbox A
   - handle H2 cannot prove H1
   - account A2 cannot prove A1
Provenance:
   - tampered payload hash fails
   - wrong collector program hash fails
   - inadmissible evidence class fails
   - same-channel evidence rejected where independent readback is required
Program roots:
   - change one judge byte =3D> different ContractRoot or verification fail=
ure
   - runtime/config/dependency hash change =3D> fail under old root
Authority:
   - invalid signature =3D> denied
   - expired grant =3D> denied
   - wrong subject =3D> denied
   - wrong action =3D> denied
   - payload mutation after signing =3D> denied
   - price over cap =3D> denied
   - reused one-shot nonce =3D> denied
   - truth TRUE without grant =3D> effect denied
   - valid grant without required prerequisite truth =3D> effect denied
Effects:
   - provider POST success + readback failure =3D> target claim UNKNOWN / n=
o
   success receipt
   - provider POST failure =3D> no target success receipt
   - successful readback =3D> settled receipt
   - idempotency prevents duplicate spend/effect
   - reserve succeeds then executor crashes =3D> reconciliation state; gran=
t
   is not silently reusable
Replay:
   - canonical receipt replay =3D> PASS
   - mutate evidence =3D> FAIL
   - mutate gate result =3D> FAIL
   - mutate state_after =3D> FAIL
   - mutate authority reference =3D> FAIL
   - wrong historical freshness evaluation =3D> FAIL
Non-circularity:
   - worker self-report success:true cannot satisfy target claim without
   admissible evidence
   - target JSON cannot mint a trusted proof simply by naming it
   - task done cannot settle a world-state claim
22. Suggested module structure src/qp/ canonical.ts hash.ts types.ts
contracts.ts claims.ts evidence.ts programs.ts actuality.ts gates.ts
grants.ts reserve.ts transition.ts receipts.ts replay.ts store.ts host.ts
src/probes/ cloudflare.ts dns.ts emailChallenge.ts telnyx.ts
smsChallenge.ts socials/ src/effects/ cloudflareDomain.ts cloudflareDns.ts
telnyxNumber.ts emailSend.ts socials/ proofspecs/ domain_available.v1.json
domain_owned.v1.json dns_configured.v1.json email_route_configured.v1.json
email_receives.v1.json phone_owned.v1.json sms_receives.v1.json
handle_available.v1.json account_owned.v1.json handle_bound.v1.json
oauth_authorized.v1.json can_post.v1.json email_send_accepted.v1.json
email_delivered.v1.json 23. Migration order A =E2=80=94 Freeze and secure
   - pin baseline commit/tree
   - authenticate MCP
   - quarantine unauthenticated consequential operations
   - add regression tests around current live functions
B =E2=80=94 Build QP kernel in isolation
Implement:
   - canonical serialization/hashing
   - ContractRoot
   - Claim / Evidence / Actuality
   - ProgramBundle hashing
   - grants and signatures
   - reservation/consumption
   - TransitionReceipt
   - replay
   - append-only store/event chain
Do not connect effects yet.
C =E2=80=94 Prove one vertical end-to-end
Use inbound email because EVP-1 already has the correct core idea:
domain_owned -> dns_configured -> email_route_configured -> email_receives
Require a real nonce round-trip and demonstrate independent replay from
stored artifacts.
D =E2=80=94 Make one real effect QP-only
Use domain purchase or phone purchase:
signed grant -> reserve -> effect -> provider readback -> target proof ->
TransitionReceipt -> reconciliation
Then eliminate the old direct bypass.
E =E2=80=94 Migrate remaining consequential effects
   - DNS/email wiring
   - phone purchase/configuration
   - outbound email
   - social/account writes
   - OAuth mutation
   - posting
F =E2=80=94 Rebuild setup.social orchestration over QP claims
Targets become desired proof sets. The planner resolves UNKNOWN claims by
choosing admissible probes/effects. Mission completion is determined only
by settled required claims.
24. Desired end-state
A request like:
Set up privately.win everywhere
should compile into desired claims, not imperative scripts:
domain_owned(privately.win) email_receives(agents@privately.win)
phone_owned(...) account_owned(youtube,...)
handle_bound(youtube,...,privatelywin) account_owned(x,...)
handle_bound(x,...,privatelywin) ...
QP determines which are TRUE / FALSE / UNKNOWN.
UNKNOWN claims trigger admissible proof routes. Some routes are pure
observation. Some require a world-changing effect. Those require authority.
After any effect, independent evidence/readback is used to settle the
target claim.
The reusable primitive is:
DesiredState -> unresolved claims -> evidence/effect routes -> bounded
authority where required -> world interaction -> independent readback -> QP
settlement -> new canonical state
That is what everything else should span outward from.
25. Definition of done
Do not call this QP-complete until all are true:
   - [ ] no consequential provider action is reachable without
   authenticated principal + valid QP grant
   - [ ] canonical claim truth is TRUE/FALSE/UNKNOWN
   - [ ] frozen ContractRoot pins exact
   semantics/programs/freshness/authority rules
   - [ ] evidence carries provenance and content identity
   - [ ] external effects use independent post-effect readback where
   possible
   - [ ] no successful target claim settles when readback is UNKNOWN
   - [ ] facts and authority use different object types and graph edges
   - [ ] TransitionReceipts are content-addressed, signed and append-only
   - [ ] deterministic independent replay passes on canonical receipts
   - [ ] task/mission status is projection only and cannot promote truth
   - [ ] target JSON cannot invent trusted proof semantics
   - [ ] inbound email round-trip proves the exact mailbox
   - [ ] phone ownership uses provider account readback
   - [ ] social availability and account ownership are separate claims
   - [ ] OAuth scope authorization is explicitly proven
   - [ ] direct bypass routes are removed or inaccessible
   - [ ] adversarial proof/authority/replay tests pass
The target is not more QP-looking JSON. The target is one unavoidable
constitutional boundary between an agent saying something happened,
evidence showing what happened, and the system being permitted to change
the world.