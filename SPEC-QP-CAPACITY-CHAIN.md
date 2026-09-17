# QP Capacity Chain — Full Dependency Grid

## Mapping: QP Proofs → Capacity System

| QP Concept | Capacity System | Example |
|------------|----------------|---------|
| **CLAIM** | Capacity claim | "agents@agentcom.org can receive email" |
| **EVIDENCE** | Infrastructure proof | DNS dig output, CF API response, cmail MCP |
| **GATE** | Verifier function | `receive_email_verifier(evidence) → PASS/FAIL` |
| **GRANT** | Downstream unlock | "can now sign up for GitHub using this email" |
| **RECEIPT** | TransitionReceipt | The verdict JSON proving capacity is ACTIVE |
| **PROOF LEVEL** | Authorization scope | V4=internal, V7=canonical, V9=external action |
| **STATE** | Capacity status | UNKNOWN → PENDING → ACTIVE/FAILED |

---

## The Dependency Grid

Every capacity has:
1. A **CLAIM** (what we're proving)
2. **EVIDENCE** (what we gather)
3. **GATES** (what must pass)
4. **GRANTS** (what this unlocks)
5. A **PROOF LEVEL** (what authority this grants)

```
V0 ──────────────────────────────────────────────────────────
│  CAPACITY: have_domain(X)
│  CLAIM:    "Domain X is owned and DNS-active"
│  EVIDENCE: dig MX X + dig TXT X + CF zone API
│  GATES:    [dns-valid-v1, cf-zone-active-v1]
│  PROOF:    V7 (canonical infrastructure fact)
│  GRANTS:   → receive_email(X)
│            → have_cloudflare_zone(X)
│            → can_wire_email(X)
│
V4 ──────────────────────────────────────────────────────────
│  CAPACITY: receive_email(addr@X)
│  CLAIM:    "addr@X can receive inbound email"
│  EVIDENCE: MX records + SPF + routing rules + worker live + mailbox indexed
│  GATES:    [email-infrastructure-v1, routing-catchall-v1, worker-live-v1, mailbox-indexed-v1]
│  PROOF:    V7 (canonical infrastructure fact)
│  GRANTS:   → can_signup_service(addr@X, service)  [for each social service]
│            → can_receive_verification(addr@X)
│            → can_receive_orders(addr@X)
│
│  CAPACITY: have_cloudflare_zone(X)
│  CLAIM:    "Zone X is active in our CF account"
│  EVIDENCE: CF zone API response
│  GATES:    [cf-zone-active-v1]
│  PROOF:    V4 (local derived metric)
│  GRANTS:   → can_manage_dns(X)
│            → can_configure_email_routing(X)
│
V7 ──────────────────────────────────────────────────────────
│  CAPACITY: have_handle(platform, handle)
│  CLAIM:    "We own @handle on platform"
│  EVIDENCE: platform API check (HTTP status + body marker)
│  GATES:    [handle-owned-v1, platform-live-v1]
│  PROOF:    V7 (canonical identity fact)
│  GRANTS:   → can_post(platform, handle)
│            → can_auth(platform, handle)
│
│  CAPACITY: have_phone(number)
│  CLAIM:    "We own phone number +X XXX XXX XXXX"
│  EVIDENCE: Telnyx API list response
│  GATES:    [phone-purchased-v1, phone-active-v1]
│  PROOF:    V7 (canonical identity fact)
│  GRANTS:   → can_receive_sms(number)
│            → can_verify_phone(number)
│
V9 ──────────────────────────────────────────────────────────
│  CAPACITY: can_send_email(addr@X)
│  CLAIM:    "addr@X can send outbound email"
│  EVIDENCE: send test + delivery receipt
│  GATES:    [send-confirmed-v1, delivery-receipt-v1]
│  PROOF:    V9 (external action — sends real email)
│  GRANTS:   → can_email_customers(addr@X)
│            → can_send_notifications(addr@X)
│
│  CAPACITY: can_purchase_domain(X)
│  CLAIM:    "Human approved purchase of X for $Y"
│  EVIDENCE: approval receipt + CF purchase API response
│  GATES:    [human-approved-v1, purchase-confirmed-v1]
│  PROOF:    V9 (financial action — real money)
│  GRANTS:   → have_domain(X)  [unlocks the whole chain]
│
V12 ─────────────────────────────────────────────────────────
│  CAPACITY: can_deploy_store(X)
│  CLAIM:    "Store X is live and accepting orders"
│  EVIDENCE: DNS + SSL + deploy receipt + health check
│  GATES:    [store-live-v1, ssl-valid-v1, health-ok-v1]
│  PROOF:    V12 (maximum authority — autonomous commerce)
│  GRANTS:   → can_process_orders(X)
│            → can_collect_payment(X)
│            → can_fulfill_orders(X)
```

---

## Gate Definitions (QP-style)

Each gate is a **pure function**, content-addressed, versioned.

```python
# Gate: dns-valid-v1
# Evidence: dig MX + dig TXT output
# Pass: MX records present AND point to expected receiver
def dns_valid(evidence: dict) -> tuple[bool, str]:
    mx = evidence.get("mx_records", [])
    spf = evidence.get("spf_record", "")
    has_mx = any("cloudflare" in r for r in mx)
    has_spf = "v=spf1" in spf
    return has_mx and has_spf, f"mx={len(mx)}, spf={bool(spf)}"

# Gate: cf-zone-active-v1
# Evidence: CF zone API response
# Pass: zone.status == "active"
def cf_zone_active(evidence: dict) -> tuple[bool, str]:
    return evidence.get("status") == "active", f"status={evidence.get('status')}"

# Gate: email-infrastructure-v1
# Evidence: composite of MX + SPF + routing + worker + mailbox
# Pass: all sub-checks green
def email_infrastructure(evidence: dict) -> tuple[bool, str]:
    checks = {
        "mx": bool(evidence.get("mx_records")),
        "spf": "v=spf1" in evidence.get("spf_record", ""),
        "routing": evidence.get("routing_rules", 0) > 0,
        "catch_all": evidence.get("catch_all", False),
        "worker": evidence.get("worker_live", False),
        "mailbox": evidence.get("mailbox_indexed", False),
    }
    passed = all(checks.values())
    failed = [k for k, v in checks.items() if not v]
    return passed, f"failed: {failed}" if failed else "all green"

# Gate: routing-catchall-v1
# Evidence: CF email routing rules
# Pass: catch-all rule exists and is enabled
def routing_catchall(evidence: dict) -> tuple[bool, str]:
    rules = evidence.get("rules", [])
    catch = [r for r in rules if any(m.get("type") == "all" for m in r.get("matchers", []))]
    enabled = [r for r in catch if r.get("enabled")]
    return len(enabled) > 0, f"catch_all={len(enabled)}"

# Gate: worker-live-v1
# Evidence: /api/stats response
# Pass: response contains "needs_me"
def worker_live(evidence: dict) -> tuple[bool, str]:
    return "needs_me" in evidence, f"stats={evidence}"

# Gate: mailbox-indexed-v1
# Evidence: email.list_mailboxes response
# Pass: target address exists in mailbox list
def mailbox_indexed(evidence: dict) -> tuple[bool, str]:
    target = evidence.get("target", "")
    mbs = evidence.get("mailboxes", [])
    found = any(target in m.get("id", "") for m in mbs)
    return found, f"target={target}, found={found}"

# Gate: human-approved-v1
# Evidence: approval receipt with human principal
# Pass: approved_by starts with "human:" and is not expired
def human_approved(evidence: dict) -> tuple[bool, str]:
    approved_by = evidence.get("approved_by", "")
    expires = evidence.get("expires", 0)
    is_human = approved_by.startswith("human:") and len(approved_by) > 6
    not_expired = expires == 0 or time.time() < expires
    return is_human and not_expired, f"by={approved_by}, expired={not not_expired}"

# Gate: handle-owned-v1
# Evidence: platform API check
# Pass: status is "available" or "owned"
def handle_owned(evidence: dict) -> tuple[bool, str]:
    status = evidence.get("status", "")
    return status in ("available", "owned"), f"status={status}"
```

---

## The TransitionReceipt (QP Proof of Capacity)

When a capacity is verified, we produce a QP TransitionReceipt:

```json
{
  "protocol": "acom/0.1",
  "transition_type": "RESOLVE",
  "proof_level": 7,
  "subject": "claim:receive_email:agents@agentcom.org",
  "state_before": {
    "cursor": 0,
    "capacities": {"cap:receive_email:agents@agentcom.org": "UNKNOWN"}
  },
  "proposal": {
    "claim": {
      "kind": "CLAIM",
      "id": "claim:receive_email:agents@agentcom.org",
      "statement": "agents@agentcom.org can receive inbound email via Cloudflare Email Routing",
      "domain": "agentcom.org",
      "result": "TRUE"
    },
    "grant": null
  },
  "evidence_root": "merkle_root_of_all_evidence_hashes",
  "gates": [
    {"id": "dns-valid-v1", "result": "PASS", "proof": "mx=3, spf=True"},
    {"id": "cf-zone-active-v1", "result": "PASS", "proof": "status=active"},
    {"id": "email-infrastructure-v1", "result": "PASS", "proof": "all green"},
    {"id": "routing-catchall-v1", "result": "PASS", "proof": "catch_all=1"},
    {"id": "worker-live-v1", "result": "PASS", "proof": "stats OK"},
    {"id": "mailbox-indexed-v1", "result": "PASS", "proof": "target=agents@agentcom.org, found=True"}
  ],
  "grant": null,
  "run": {
    "kind": "RUN",
    "task": "verify-capacity",
    "worker": "verify-capacity.sh",
    "model": "bash+dig+curl",
    "tokens": 0,
    "cost": 0.0,
    "duration_ms": 1200
  },
  "state_after": {
    "cursor": 1,
    "capacities": {"cap:receive_email:agents@agentcom.org": "ACTIVE"}
  },
  "passed": true,
  "id": "receipt:a1b2c3d4e5f67890",
  "signature": "",
  "signer": ""
}
```

---

## The Grant Chain (What Each Capacity Unlocks)

```
have_domain(X)
├──→ GRANT: receive_email(*@X)           [proof_level=7]
├──→ GRANT: have_cloudflare_zone(X)      [proof_level=4]
├──→ GRANT: can_manage_dns(X)            [proof_level=4]
│
receive_email(agents@X)
├──→ GRANT: can_signup_service(agents@X, github)     [proof_level=7]
├──→ GRANT: can_signup_service(agents@X, x)          [proof_level=7]
├──→ GRANT: can_signup_service(agents@X, youtube)    [proof_level=7]
├──→ GRANT: can_signup_service(agents@X, npm)        [proof_level=7]
├──→ GRANT: can_signup_service(agents@X, bluesky)    [proof_level=7]
├──→ GRANT: can_signup_service(agents@X, gitlab)     [proof_level=7]
├──→ GRANT: can_receive_verification(agents@X)       [proof_level=7]
├──→ GRANT: can_receive_orders(agents@X)             [proof_level=7]
│
have_handle(github, @handle)
├──→ GRANT: can_post(github, @handle)                [proof_level=7]
├──→ GRANT: can_auth(github, @handle)                [proof_level=7]
│
have_phone(+X)
├──→ GRANT: can_receive_sms(+X)                      [proof_level=7]
├──→ GRANT: can_verify_phone(+X)                     [proof_level=7]
│
can_send_email(agents@X)
├──→ GRANT: can_email_customers(agents@X)            [proof_level=9]
├──→ GRANT: can_send_notifications(agents@X)         [proof_level=9]
│
can_deploy_store(X)
├──→ GRANT: can_process_orders(X)                    [proof_level=12]
├──→ GRANT: can_collect_payment(X)                   [proof_level=12]
├──→ GRANT: can_fulfill_orders(X)                    [proof_level=12]
```

---

## The Activation Flow (How Capacities Drive the System)

```
1. Agent runs verify-capacity.sh for domain X
2. Evidence collected: DNS, CF API, cmail MCP
3. Gates evaluated: dns-valid, cf-zone-active, email-infra, routing, worker, mailbox
4. ALL GATES PASS → TransitionReceipt produced
5. Receipt appended to event store (hash-chained)
6. Capacity status: UNKNOWN → ACTIVE
7. GRANT emitted: "can_signup_service(agents@X, github)"
8. GitHub signup task UNBLOCKED → appears in human queue (if needs approval) or auto-executes
9. Repeat for each downstream capacity
```

### The Human Queue Trigger

When a grant is emitted, the system checks:
1. Does this grant unlock a task that requires human approval?
2. If YES → add to human queue with approval format
3. If NO → auto-execute the task

Example:
```
GRANT: can_signup_service(agents@agentcom.org, github)
  → github signup is autonomous (no money involved)
  → Task auto-executes: agent signs up for GitHub using agents@agentcom.org
  → Evidence: GitHub API response
  → New CAPACITY: have_handle(github, @agentcom)
  → New GRANT: can_post(github, @agentcom)
  → Next task unblocked: create GitHub profile
```

vs.

```
GRANT: have_domain(privately.win)  [from human-approved purchase]
  → email wiring is autonomous
  → Task auto-executes: wire email routing
  → New CAPACITY: receive_email(agents@privately.win)
  → New GRANT: can_signup_service(agents@privately.win, github)
  → GitHub signup is autonomous → auto-executes
  → ... chain continues
```

---

## The Full Grid (All Capacities × All Dependencies)

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    CAPACITY GRID                        │
                    ├─────────────────────────────────────────────────────────┤
                    │                                                         │
                    │  ┌──────────────┐                                      │
                    │  │ can_purchase │ ← HUMAN: approve $X                  │
                    │  │ _domain(X)   │   proof_level: V9                    │
                    │  └──────┬───────┘                                      │
                    │         │ GRANT: have_domain(X)                        │
                    │         ▼                                              │
                    │  ┌──────────────┐                                      │
                    │  │ have_domain  │ ← GATE: dns-valid + cf-zone-active  │
                    │  │ (X)          │   proof_level: V7                    │
                    │  └──────┬───────┘                                      │
                    │         │ GRANT: receive_email(*@X)                    │
                    │         │ GRANT: have_cloudflare_zone(X)              │
                    │         │ GRANT: can_manage_dns(X)                    │
                    │         ▼                                              │
                    │  ┌──────────────┐                                      │
                    │  │ receive_     │ ← GATE: email-infra + routing +     │
                    │  │ email(addr@X)│   worker-live + mailbox-indexed     │
                    │  └──────┬───────┘   proof_level: V7                    │
                    │         │ GRANT: can_signup_service(addr@X, *)        │
                    │         │ GRANT: can_receive_verification(addr@X)     │
                    │         ├──────────┬──────────┬──────────┐            │
                    │         ▼          ▼          ▼          ▼            │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
                    │  │ signup   │ │ signup   │ │ signup   │ │ signup   │ │
                    │  │ github   │ │ x        │ │ youtube  │ │ npm      │ │
                    │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
                    │       │ GRANT      │ GRANT      │ GRANT      │ GRANT │
                    │       ▼            ▼            ▼            ▼       │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
                    │  │ have_    │ │ have_    │ │ have_    │ │ have_    │ │
                    │  │ handle   │ │ handle   │ │ handle   │ │ handle   │ │
                    │  │ github   │ │ x        │ │ youtube  │ │ npm      │ │
                    │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
                    │                                                         │
                    │  ┌──────────────┐                                      │
                    │  │ have_phone   │ ← HUMAN: approve $X/mo              │
                    │  │ (+X)         │   proof_level: V9                    │
                    │  └──────┬───────┘                                      │
                    │         │ GRANT: can_receive_sms(+X)                  │
                    │         ▼                                              │
                    │  ┌──────────────┐                                      │
                    │  │ can_send_    │ ← GATE: send-confirmed +            │
                    │  │ email(addr@X)│   delivery-receipt                  │
                    │  └──────┬───────┘   proof_level: V9                    │
                    │         │ GRANT: can_email_customers(addr@X)          │
                    │         ▼                                              │
                    │  ┌──────────────┐                                      │
                    │  │ can_deploy_  │ ← GATE: store-live + ssl-valid +    │
                    │  │ store(X)     │   health-ok                         │
                    │  └──────────────┘   proof_level: V12                   │
                    │         │ GRANT: can_process_orders(X)                │
                    │         │ GRANT: can_collect_payment(X)               │
                    │         │ GRANT: can_fulfill_orders(X)                │
                    │         ▼                                              │
                    │  ┌──────────────┐                                      │
                    │  │ MISSION      │                                      │
                    │  │ COMPLETE     │                                      │
                    │  └──────────────┘                                      │
                    │                                                         │
                    └─────────────────────────────────────────────────────────┘
```

---

## Implementation Path

### Phase 1: QP Receipt Engine (in cmail worker)
- Port `acom/objects.py`, `acom/gates.py`, `acom/receipts.py`, `acom/canonical.py` to TypeScript
- Register our gates: `dns-valid-v1`, `email-infrastructure-v1`, `routing-catchall-v1`, `worker-live-v1`, `mailbox-indexed-v1`
- `verify-capacity.sh` feeds evidence into the QP kernel
- QP kernel produces TransitionReceipt
- Receipt appended to D1 event store

### Phase 2: Grant Emitter
- When receipt.passed == true, emit grants based on capacity type
- Grants stored in D1 grants table
- Each grant checked before task execution

### Phase 3: Task Auto- Unblock
- Task system watches for grants
- When grant matches a task's required_capacity → task status: blocked → ready
- If task is autonomous → auto-execute
- If task needs human → add to human queue

### Phase 4: Mission Orchestrator
- Mission分解 phases with required capacities
- Each phase has a set of grants it needs
- When all grants for a phase are emitted → phase complete → next phase starts
- Mission complete when all phases complete
