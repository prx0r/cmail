# UK Business Phone Number Agent Blueprint

A canonical, provider-aware rubric for an autonomous business setup agent (e.g. `cmail/stevejobless`) to decide what UK phone identity a new business should use, search Telnyx inventory, rank real candidates, explain the trade-offs, and ask a human to approve the final purchase.

## Core principle

Do **not** ask "which Telnyx number looks good?"

Use this pipeline:

1. understand the business;
2. derive communications requirements;
3. choose the UK number **semantics** (local / national / mobile / toll-free);
4. run compliance preflight;
5. query live Telnyx inventory;
6. reject candidates that fail hard constraints;
7. score feasible candidates for business fit, memory/speech quality, operational capability and cost;
8. choose a **diverse top three** rather than three near-duplicates;
9. explain each option in plain English;
10. reserve only when useful;
11. require explicit approval before purchase;
12. wire the purchased number to voice/messaging infrastructure;
13. log outcomes so policy can improve.

Telnyx is the inventory/provisioning provider. The business-number policy should remain provider-independent.

## Recommended integration into `cmail`

Suggested location:

```text
stevejobless/
  knowledge/
    telephony/
      GB.yaml
  src/stevejobless/
    phone_identity/
      models.py
      strategy.py
      score.py
      telnyx.py
      explain.py
      workflow.py
```

Existing `cmail` rules still apply:
- money moves require explicit human approval;
- recheck live price/availability immediately before spend;
- secrets stay in vault/env;
- fail closed;
- receipt every mutation;
- do not let an LLM invent provider fields or compliance facts.

## What is "always optimal"?

These are close to universal:

- **Capability first.** A beautiful number that cannot support the required channel is invalid.
- **Compliance first.** Do not recommend numbers that the customer cannot lawfully/operationally activate.
- **Do not fake locality.** A London-looking local number for a Nottingham-only business is not an "upgrade".
- **Among equivalent numbers, prefer lower cognitive complexity.** Repetition, repeated pairs, symmetry and low chunk count are generally preferable to random strings.
- **Prefer easy spoken forms.** The business number will be heard, dictated and transcribed.
- **Avoid unnecessary geographic lock-in.** Geographic identity is useful only when locality is actually part of the buying decision.
- **Minimise recurring cost when utility is otherwise equal.**
- **Keep provider portability in mind.** The phone identity belongs to the business, not to Telnyx.
- **Never silently buy.** Search/rank/explain autonomously; reserve or buy only under the configured authority policy.
- **Log why.** Every recommendation should be reproducible from structured features.

## Start here

Read in this order:

1. `docs/RUBRIC.md`
2. `policy/GB.yaml`
3. `scenarios/*.yaml`
4. `docs/TELNYX_REFERENCE.md`
5. `schemas/*.json`
6. `src/scorer.py`
7. `src/decision_engine.py`

The three scenarios intentionally produce different configurations:
- local electrician: local geographic voice identity + optional separate mobile messaging identity;
- UK-wide ecommerce/service brand: national primary identity + separate messaging endpoint;
- inbound-heavy national support/lead service: toll-free public identity, with a separate operational mobile/SMS number where required.

This package is a blueprint and test harness, not a production credentialed Telnyx client.
