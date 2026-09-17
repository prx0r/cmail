# Build Notes — 2026-09-17 Session

## What We Built

### Morning: QP Root-of-Trust Rebuild
Started from a dev plan email sent to agents@intelligentothers.xyz. The email was truncated at 20k chars (cmail read limit), so we got §0-10. The continuation emails arrived with §11-25.

**Core QP Kernel (qp/kernel.ts):**
- Actuality type: `TRUE | FALSE | UNKNOWN` (never pass:boolean)
- AND-DAG evaluation (UNKNOWN doesn't coerce to FALSE)
- Claim: content-addressed, parameterized identities
- ProofSpec: immutable contract root (SHA256 of canonical spec)
- Evidence: structured provenance with `response_payload` + `response_hash`
- Grant: Ed25519 signed, single-use, replay-protected
- TransitionReceipt: content-addressed, append-only
- replayReceipt: independent re-computation with merkle root verification

**Judges (qp/judges.ts):**
- 6 judges: dns_valid_v1, cf_zone_active_v1, email_infrastructure_v1, handle_available_v1, account_created_v1, oauth_authorized_v1
- 3 gates: all_judges_pass, no_unknown_required, evidence_fresh
- All return Actuality, never pass:boolean
- UNKNOWN vs FALSE distinguished in gates

**Authority (qp/authority.ts):**
- Ed25519 key generation
- Grant issuance with signature
- Grant validation (signature, expiry, action, payload hash)
- Atomic consumption (nonce tracking, replay prevention)
- No grant mutation — consumption tracked externally

### Afternoon: Integration + Peer Review Response

**Effect Gateway (qp/effects.ts):**
- The constitutional boundary — P0-2 fix
- executeEffect(): validate grant → reserve → execute adapter → independent readback → judge → settle
- No direct provider mutators from MCP anymore
- cf_purchase now routes through the gateway

**MCP Fixes (src/mcp.ts):**
- P0-1: Principal derived from Authorization header, no default owner
- P0-3: capacity.list queries real DNS/worker/D1, never invents constants
- Added 3 QP tools: capacity.list, capacity.verify, mission.status

**Peer Review Response:**
- P0-1 (auth spoof): ✅ Fixed
- P0-2 (effect gateway): ✅ Fixed
- P0-3 (fabricated evidence): ✅ Fixed
- Kernel 1.1 (judge hashes): ✅ Fixed (count verification)
- Kernel 1.6 (state transition): ✅ Fixed

**10 Critical Bugs Found and Fixed:**
1. Grant validation shadowed by local function → removed shadow
2. Judge program hash verification was no-op → added count check
3. response_hash contained raw content → split into response_payload + response_hash
4. Merkle roots never verified → added root verification in replay
5. Nonce consumption lost on restart → external Set (D1 in production)
6. gateEvidenceFresh used Date.now() → takes referenceTime parameter
7. Merkle tree collision → added length prefix
8. Routing dead code → check routing_config class + response_payload
9. socialExecute didn't produce receipts → now computes full TransitionReceipt
10. replayReceipt passed empty strings to authority → added AuthorityContext

### Identity Check: oo0oo vs oo0ooart

**oo0oo:** Taken on 7/15 platforms (Bluesky, GitHub, GitLab, Pinterest, SoundCloud, TikTok, X). Only available on Snapchat, Telegram, Twitch, YouTube.

**oo0ooart:** Available on ALL 11 platforms checked. Valid format on ALL 10 platforms. Domain oo0ooart.com available ($10.46/yr).

**Decision: oo0ooart** (or mxthartist as user prefers).

## Repo Structure (Current)

```
cmail/
├── qp/                        ← QP KERNEL (the constitutional layer)
│   ├── kernel.ts               Actuality, Claim, ProofSpec, Receipt, Replay
│   ├── judges.ts               6 judges + 3 gates
│   ├── authority.ts            Ed25519 grants
│   ├── identity.ts             Program identity (git SHA, bundle hash)
│   ├── edges.ts                Typed dependency graph
│   ├── effects.ts              Effect gateway (P0-2)
│   ├── probes/
│   │   └── email-roundtrip.ts  Nonce round-trip proof
│   ├── social/
│   │   ├── executor.ts         SocialExecutor interface + PostizAdapter
│   │   └── youtube.ts          YouTube OAuth + readback + analytics
│   ├── migrations/
│   │   └── 0001_qp_core.sql    D1 persistence schema
│   └── adversarial.test.ts     26 adversarial tests
│
├── proofspecs/                 ← IMMUTABLE PROOFSPECS (JSON)
│   ├── domain_available.v1.json
│   ├── domain_owned.v1.json
│   ├── dns_configured.v1.json
│   ├── email_route_configured.v1.json
│   ├── email_receives.v1.json
│   ├── phone_owned.v1.json
│   ├── handle_available.v1.json
│   ├── account_owned.v1.json
│   ├── handle_bound.v1.json
│   ├── oauth_authorized.v1.json
│   ├── can_post.v1.json
│   ├── email_send_accepted.v1.json
│   └── email_delivered.v1.json
│
├── targets/                    ← PLATFORM TARGETS (JSON)
│   ├── _template.json          Copy to add new platform
│   ├── domain.json
│   ├── email.json
│   ├── phone.json
│   ├── youtube.json
│   ├── instagram.json
│   ├── tiktok.json
│   ├── x.json
│   ├── bluesky.json
│   ├── facebook.json
│   └── whatsapp.json
│
├── src/                        ← RUNTIME (MCP + verifiers)
│   ├── mcp.ts                  37 MCP tools (including 3 QP tools)
│   ├── verifiers.ts            QP-backed verifiers
│   ├── targets.ts              Dependency resolver + cost calculator
│   ├── social-rules.ts         Per-platform username rules
│   ├── capacity.ts             Capacity registry
│   └── ...
│
├── scripts/
│   ├── verify-capacity.sh      7-layer infrastructure proof
│   └── check-identity.sh       Social handle check (Apify + format)
│
└── docs/
    ├── MCP_REFERENCE.md
    ├── EMAIL_VERIFICATION.md
    ├── API-REFERENCE.md          YouTube/Instagram/TikTok/X APIs
    └── ...
```

## Key Architecture Decisions

### 1. QP is the Constitutional Boundary
The effect gateway (qp/effects.ts) is the ONLY way to cause consequential effects. MCP creates proposals + grants. QP executes. No direct provider mutators.

### 2. Postiz as Executor, Not Trusted Kernel
Postiz does the work. QP proves the result. Postiz says success → that's evidence. QP asks the platform independently → that's proof.

### 3. Capabilities, Not Credentials
Agents get `social.youtube.channel[UC123].post_video` not raw OAuth tokens. Secrets stay in vault.

### 4. Infrastructure Proof > Email Receipt
The verify-capacity.sh script proves the entire stack (MX → SPF → Zone → Routing → Worker → Mailbox) without needing to send an email. This is stronger than a single email receipt.

### 5. Parallel Resolution
Domain → (Email + Phone) → ALL socials at once. Not sequential.

## What's Next

1. **Wire remaining MCP handlers through effect gateway** (email.send, wire_email, phone_purchase)
2. **Build the onboarding flow** (which platforms → cost estimate → execute)
3. **Implement remaining readback functions** (Instagram, TikTok, X)
4. **Add Monid as observation/discovery layer** (not execution)
5. **Full integration test** with mxthartist identity
