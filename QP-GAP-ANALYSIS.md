# QP Gap Analysis — Dev Plan §11-25 vs Current Implementation

## What We Have ✅

| Component | File | Status |
|-----------|------|--------|
| Actuality (TRUE/FALSE/UNKNOWN) | qp/kernel.ts | ✅ Complete |
| andDAG evaluation | qp/kernel.ts | ✅ Complete |
| ProofSpec + ContractRoot | qp/kernel.ts | ✅ Complete |
| Claim (content-addressed) | qp/kernel.ts | ✅ Complete |
| Evidence (structured provenance) | qp/kernel.ts | ✅ Complete |
| Judges (pure, deterministic) | qp/judges.ts | ✅ 6 judges |
| Gates | qp/judges.ts | ✅ 3 gates |
| Grant (Ed25519 signed) | qp/authority.ts | ✅ Complete |
| TransitionReceipt | qp/kernel.ts | ✅ Content-addressed |
| replayReceipt | qp/kernel.ts | ✅ With freshness + authority |
| Verifiers with Actuality | src/verifiers.ts | ✅ All return Actuality |

## What's Missing

### Priority 1: ProofSpecs (§11)
- P1: domain_available — needs JSON ProofSpec
- P2: domain_owned — needs JSON ProofSpec
- P3: dns_configured — needs JSON ProofSpec
- P4: email_route_configured — needs JSON ProofSpec
- P5: email_receives — needs nonce round-trip proof
- P6: phone_owned — needs provider readback
- P7: sms_receives — needs durable storage (not in-memory)
- P8: handle_available — needs JSON ProofSpec
- P9: account_owned — needs authenticated provider endpoint
- P10: handle_bound — needs profile readback
- P11: oauth_authorized — needs token introspection
- P12: can_post — needs write capability proof
- P13: email_send_accepted / email_delivered — split into two

### Priority 2: Adversarial Tests (§21)
- Truth semantics tests (missing/malformed/stale evidence)
- Claim identity tests (cross-mailbox, cross-handle)
- Provenance tests (tampered hash, wrong collector)
- Program root tests (change one byte → different root)
- Authority tests (invalid sig, expired, wrong subject, payload mutation)
- Effect tests (POST success + readback failure → UNKNOWN)
- Replay tests (mutate evidence/gate/state → FAIL)
- Non-circularity tests (self-report, JSON naming, task done)

### Priority 3: Module Structure (§22)
Current flat structure vs recommended:
```
Current:                    Recommended:
  qp/kernel.ts               src/qp/canonical.ts
  qp/judges.ts               src/qp/actuality.ts
  qp/authority.ts            src/qp/contracts.ts
  src/verifiers.ts           src/qp/claims.ts
                             src/qp/evidence.ts
                             src/qp/programs.ts
                             src/qp/gates.ts
                             src/qp/grants.ts
                             src/qp/reserve.ts
                             src/qp/transition.ts
                             src/qp/receipts.ts
                             src/qp/replay.ts
                             src/qp/store.ts
                             src/probes/dns.ts
                             src/probes/email.ts
                             src/probes/social.ts
                             src/effects/cloudflare.ts
                             proofspecs/*.json
```

### Priority 4: Other Gaps
- §12: Typed edges (REQUIRES/DERIVES/ENABLES/AUTHORIZES/EFFECTS/VERIFIES)
- §13: QP effect gateway (consequential actions through QP only)
- §14: Authentication/authority (remove default owner, real credentials)
- §15: D1 persistence schema (qp_contracts, qp_claims, etc.)
- §16: Tasks as projections (not truth)
- §17: Target JSON references ProofSpecs, doesn't define semantics
- §18: Bug fixes (capacity.ts null check, split email accepted/delivered)
- §19: Source/build identity (git SHA, tree SHA, program hashes)
- §20: Security boundary (trust base definition)
