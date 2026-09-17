cmail / setup.social — QP root-of-trust rebuild

Review target: prx0r/cmail on master, currently reviewed at commit
dec850ec405bbd90ad3a2ad6680fcfaa0273a13d.

This is not a feature request. Treat it as a constitutional rebuild of the
proof/authority layer beneath cmail. Do not continue expanding outward from
the current capacity graph until the QP seam is real, because the current
runtime can perform effects without QP settlement and therefore every
downstream “proof” inherits a false root of trust.
0. The system we are actually building

cmail/setup.social should be a consumer of one real QP kernel.

The planner/agent proposes actions. Probes observe reality. Deterministic
judges evaluate evidence. QP alone commits canonical state transitions.
Consequential effects require independent bounded authority. Post-effect
reality must be independently read back before settlement.

Canonical flow:
planner / model ↓ proposal QP preflight ↓ exact claim + exact ProofSpec +
authority check reserve authority / budget ↓ effect adapter ↓ provider
response independent readback / challenge probe ↓ normalized immutable
evidence pinned deterministic judges ↓ TRUE / FALSE / UNKNOWN hard gates ↓
QP settle ↓ TransitionReceipt append-only canonical state ↓ projections /
tasks / UI

The critical separation is:
COGNITION != TRUTH != AUTHORITY

An agent may propose anything. It may not promote its own output to
canonical truth. A true fact never creates authority by itself. A signed
grant never proves that the external world changed.
1. Canonical QP proof object

Use the proof object we previously formalised:
Π_QP = (K, C, E, J, A, G, Λ, R, Σ)

Where:

   - K = frozen ProofRoot / ContractRoot. The normative semantics of the
   proof.
   - C = exact falsifiable claim identity.
   - E = immutable evidence set with provenance.
   - J = pinned deterministic judges/program bundles.
   - A = Actuality, one of TRUE | FALSE | UNKNOWN.
   - G = hard deterministic gates.
   - Λ = authority required for consequential transitions/effects.
   - R = content-addressed TransitionReceipt.
   - Σ = independent replay/settlement result.

A proof is PROVEN only when:
RootOK AND MetaVerifierOK AND ProvenanceOK AND Actuality == TRUE AND every
required Gate == PASS AND AuthorityOK when transition is consequential AND
ReceiptIntegrityOK AND Replay == PASS

Formally:
PROVEN iff RootOK ∧ MetaVerifierOK ∧ ProvenanceOK ∧ A=TRUE ∧ GatesPASS ∧
AuthorityOK ∧ ReceiptOK ∧ ReplayPASS

QP does NOT prove absolute metaphysical world truth. It proves that a
committed state transition was justified relative to frozen claim
semantics, admissible evidence, pinned verifier programs, authority, and
deterministic replay.
2. Actuality semantics are mandatory

Every judge returns exactly:
type Actuality = "TRUE" | "FALSE" | "UNKNOWN";

Never use pass:boolean as the canonical truth result.

Interpretation:

   - TRUE = sufficient admissible evidence supports the exact claim.
   - FALSE = sufficient admissible evidence contradicts the exact claim.
   - UNKNOWN = evidence missing, stale, malformed, inaccessible,
   unverifiable, probe failed, provider unavailable, unsupported, or otherwise
   insufficient to decide.

UNKNOWN must NEVER be coerced to false or true.

For a required AND-DAG:
if any required leaf == FALSE => FALSE else if any required leaf == UNKNOWN
=> UNKNOWN else => TRUE

Important consequence:
network timeout != FALSE missing token != FALSE unparseable provider
response != FALSE probe crash != FALSE

Those are UNKNOWN unless the frozen ProofSpec explicitly defines a negative
observation as falsifying evidence.

A failed attempt proves only that the attempt failed. It does not prove the
target claim false unless the ProofSpec says that exact observation is a
falsifier.
3. ContractRoot / ProofSpec

Create a real immutable ProofSpec object. Semantic changes mint a new
root/version. Never edit semantics in place while retaining the same proof
identity.

Suggested shape:
interface ProofSpec { protocol: "qp/1"; spec_id: string; version: number;
claim_schema_hash: string; evidence_schema_hash: string; actuality_dag:
ActualityNode[]; judges: Array<{ id: string; program_hash: string;
runtime_hash: string; config_hash: string; dependencies_hash: string; }>;
gates: Array<{ id: string; program_hash: string; required: boolean; }>;
freshness: Record<string, number>; // evidence class -> max age seconds
provenance_policy_hash: string; independence_policy_hash: string;
transition_program_hash: string; authority_policy_hash?: string;
proof_requirement: "TRUE" | "TRUE_AND_AUTHORITY"; }

Canonical serialization must be deterministic. Hash canonical bytes, not
normal JS object stringification.
ContractRoot = SHA256(canonical(ProofSpec))

Any change to claim semantics, evidence requirements, freshness, judge
code, runtime, dependencies, authority policy, transition semantics or gate
rules changes the ContractRoot.

Reuse may change the current plan/route, but not the ContractRoot for the
same proof semantics.
4. Claims must be exact and immutable

Do not use vague capacities like have_phone or have_handle as canonical
claims.

Use parameterized claims with stable identities.

Examples:
claim:domain_available:cloudflare:privately.win
claim:domain_owned:cloudflare:<account_id_hash>:privately.win
claim:dns_configured:privately.win
claim:email_route_configured:agents@privately.win
claim:email_receives:agents@privately.win
claim:phone_owned:telnyx:<account_id_hash>:+44... claim:sms_receives:+44...
claim:handle_available:youtube:privatelywin
claim:account_owned:youtube:<channel_id>
claim:handle_bound:youtube:<channel_id>:privatelywin
claim:oauth_authorized:google:<principal_id_hash>:<scope_set_hash>
claim:can_post:youtube:<channel_id>

Canonical claim object:
interface Claim { kind: "CLAIM"; id: string; predicate: string; subject:
Record<string,string>; statement: string; contract_root: string; }

The exact claim ID is part of proof identity. Evidence for another
address/account/handle cannot satisfy it.
5. Evidence must prove provenance, not just bytes

The current sha256(evidence_string) model is insufficient. It proves only
that bytes were hashed.

Every evidence item needs structured provenance:
interface Evidence { id: string; // content-addressed class: string; //
registrar_readback, dns_answer, smtp_challenge, etc claim_id: string;
observed_at: string; source: string; // provider / DNS authority / mailbox
/ public endpoint locator: string; // sanitized canonical source locator
collector_id: string; collector_program_hash: string;
collector_runtime_hash: string; request_hash?: string; response_hash:
string; normalized_payload_hash: string; nonce?: string;
independence_group: string; signature?: string; signer?: string; }

Evidence payload bytes go into content-addressed blob storage. Canonical
proof state stores hashes/metadata, not mutable arbitrary strings.

Required invariant:
hash(bytes) is not provenance

For important external effects, provider acknowledgement and independent
readback should be different evidence classes / independence groups where
feasible.

Same-channel acknowledgement is usually not enough to establish an
externally persistent fact.
6. Judges must be content-addressed deterministic programs

A gate name such as handle_owned_v1 means nothing unless it resolves to
immutable program bytes.

Create a registry:
interface ProgramBundle { id: string; source_hash: string; runtime_hash:
string; config_hash: string; dependency_hash: string; bundle_hash: string;
}

A proof pins bundle_hash, not only a friendly name.

Judges must be pure over canonical evidence input. No network calls inside
judges. Network observations happen in probes/collectors before judgment.
judge(evidence: CanonicalEvidenceSet): ActualityResult

A judge should return structured reasons and evidence IDs used.
7. Authority is a different object from truth

Delete the mental model that confirmed:true is authority.

A consequential effect requires a bounded signed grant/ticket issued before
the effect.

Suggested object:
interface Grant { protocol: "qp/1"; id: string; issuer: string; //
human:<public-key-id> or trusted policy issuer subject: string; //
agent/session principal action: string; // cf.domain.register,
telnyx.number.purchase, email.send, etc payload_hash: string; // exact
effect payload constraints: { max_amount?: number; currency?: string;
provider?: string; resource?: string; scopes?: string[]; }; issued_at:
string; expires_at: string; nonce: string; max_uses: 1; signature: string;
}

Use Ed25519 or equivalent modern deterministic signing.

Grant validation requires:
signature valid issuer trusted by policy subject matches executor exact
action matches exact payload hash matches constraints satisfied not expired
nonce not consumed remaining uses > 0

After reserve/consumption, replay of the same grant must fail.

Never infer authority from a true claim.

Example:
domain_available(privately.win) == TRUE

does NOT imply:
agent may purchase privately.win

The first is truth. The second requires Λ.
8. Consequential action lifecycle

For money, sends, DNS writes, account writes, OAuth grants, credential
changes, posting, etc., enforce:
AUTHORIZE -> RESERVE -> ACT -> INDEPENDENT READBACK -> SETTLE

Not:
ACT -> trust provider response -> mark done

Detailed sequence:

   1. Build exact proposed effect payload.
   2. Hash canonical payload.
   3. Validate signed grant against exact payload hash.
   4. Atomically reserve the grant/budget/idempotency key.
   5. Execute provider adapter once.
   6. Persist provider response as evidence, but do not settle target claim
   yet.
   7. Run independent readback/challenge probe.
   8. Normalize evidence.
   9. Run pinned judges and gates.
   10. If Actuality=TRUE and all gates pass, settle TransitionReceipt.
   11. Reconcile reservation/spend.
   12. Mark grant consumed.
   13. Project resulting canonical state into tasks/UI.

If readback fails or is unavailable:
NO successful target-state receipt Actuality = UNKNOWN

The effect may have happened, so retain an effect-attempt receipt and
schedule reconciliation, but do not lie about the target claim.
9. TransitionReceipt

Implement one canonical receipt object and use it everywhere.

Suggested shape:
interface TransitionReceipt { protocol: "qp/1"; transition_type: "RESOLVE"
| "EFFECT" | "REVOKE"; contract_root: string; claim_id: string;
state_before_root: string; proposal_root: string; evidence_root: string;
judge_results_root: string; gate_results_root: string; actuality: "TRUE" |
"FALSE" | "UNKNOWN"; authority_id?: string; authority_root?: string;
transition_program_hash: string; state_after_root: string; run: {
executor_id: string; program_hash: string; runtime_hash: string;
started_at: string; finished_at: string; cost?: number; };
prev_receipt_hash: string; settled_at: string; receipt_hash: string;
qp_signer: string; qp_signature: string; }

No mutable random PRF-... ID as the canonical identity. The canonical
receipt identity is the content hash of canonical receipt bytes
excluding/appropriately handling the signature field.

Receipts are append-only. Never overwrite cap.proof.
10. Replay / settlement verifier

Implement a second verification path that can take only:

   - ProofSpec / ContractRoot bundle
   - claim
   - evidence blobs + provenance
   - judge/gate program bundles
   - authority object if required
   - previous state root
   - TransitionReceipt

and independently recompute:

   - hashes
   - freshness at historical settled_at
   - evidence admissibility
   - actuality
   - gate outcomes
   - authority validity/consumption semantics
   - transition result
   - resulting state root
   - receipt hash/signature

It must return PASS | FAIL, never silently repair the receipt.

Canonical proof requires replay PASS.
11. Exact cmail ProofSpecs

Implement the following first. These are the root proofs from which
setup.social can safely expand.
P1 — domain_available(provider, domain)

Claim:
The named registrar/provider curre