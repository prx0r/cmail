# QP Capacity Chain — Global Dependency Grid

## Autonomy Classification

| Platform | Signup Method | Autonomy | Bottleneck |
|----------|-------------|----------|-----------|
| **Cloudflare** | API (CF_API_TOKEN) | 🟢 FULL | None — API creates zone + email routing |
| **cmail** | API (worker endpoint) | 🟢 FULL | None — MCP creates mailbox |
| **Bluesky** | Public API | 🟢 FULL | None — `com.atproto.server.createAccount` |
| **npm** | API (npm token) | 🟢 FULL | None — `npm token create` + profile API |
| **PyPI** | API (token) | 🟢 FULL | None — publisher API |
| **crates.io** | API (token) | 🟢 FULL | None — crate publish API |
| **GitHub** | Web (captcha) | 🟡 SEMI | Playwright signup + email verification |
| **GitLab** | Web (captcha) | 🟡 SEMI | Playwright signup + email verification |
| **YouTube** | Google account | 🟡 SEMI | Need Google account first (manual or Playwright) |
| **X/Twitter** | Web (captcha) | 🟡 SEMI | Playwright signup + phone verification |
| **TikTok** | Private API | 🟡 SEMI | Private API + captcha solver needed |
| **Instagram** | Private API | 🔴 HARD | Meta captcha + phone verification + ToS risk |
| **Phone (Telnyx)** | API | 🟢 FULL | None — API purchases number |
| **Domain (CF)** | API | 🟢 FULL | None — API registers domain ($$) |
| **Email Send** | CF Email Service | 🟡 SEMI | Needs Workers Paid ($5/mo) |

---

## The Canonical Dependency Grid

Every node is a QP CAPACITY. Every edge is a QP GRANT. Every gate is a QP GATE.

```
═══════════════════════════════════════════════════════════════════════
PHASE 0: IDEATION (agent, autonomous)
═══════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │ CAPACITY: ideation_complete(X)      │
  │ TYPE: internal                      │
  │ CLAIM: "Business name X selected"   │
  │ EVIDENCE: name.search + name.social │
  │ GATES: [name_available_v1]          │
  │ PROOF_LEVEL: V2                     │
  │ GRANTS: → can_purchase_domain(X)    │
  │ STACK: cmail MCP (name.search,      │
  │        name.social)                  │
  │ DOCS: cmail/GUIDE.md Chapter 1-2    │
  └──────────────────┬──────────────────┘
                     │ GRANT: can_purchase_domain(X)
                     ▼
═══════════════════════════════════════════════════════════════════════
PHASE 1: DOMAIN (human approval → agent executes)
═══════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │ CAPACITY: can_purchase_domain(X)    │
  │ TYPE: human_action                  │
  │ CLAIM: "Human approved $Y for X"    │
  │ EVIDENCE: approval receipt          │
  │ GATES: [human_approved_v1]          │
  │ PROOF_LEVEL: V9                     │
  │ GRANTS: → have_domain(X)            │
  │ STACK: Human queue (confirm text)   │
  │ DOCS: cmail/GUIDE.md Chapter 3      │
  └──────────────────┬──────────────────┘
                     │ GRANT: have_domain(X)
                     ▼
  ┌─────────────────────────────────────┐
  │ CAPACITY: have_domain(X)            │
  │ TYPE: infrastructure                │
  │ CLAIM: "Domain X owned + DNS live"  │
  │ EVIDENCE: dig MX + CF zone API      │
  │ GATES: [dns_valid_v1,               │
  │         cf_zone_active_v1]          │
  │ PROOF_LEVEL: V7                     │
  │ GRANTS: → receive_email(*@X)        │
  │         → have_cloudflare_zone(X)   │
  │         → can_manage_dns(X)         │
  │ STACK: Cloudflare Registrar API     │
  │ DOCS: cmail/docs/DOMAINS.md         │
  │        Cloudflare Registrar docs    │
  └──────────────────┬──────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │ receive_ │ │ have_    │ │ can_     │
  │ email    │ │ cloud-   │ │ manage_  │
  │ (*@X)    │ │ flare_   │ │ dns(X)   │
  │          │ │ zone(X)  │ │          │
  └────┬─────┘ └──────────┘ └──────────┘
       │
═══════════════════════════════════════════════════════════════════════
PHASE 2: EMAIL INFRASTRUCTURE (agent, autonomous)
═══════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │ CAPACITY: receive_email(addr@X)     │
  │ TYPE: infrastructure                │
  │ CLAIM: "addr@X receives email"      │
  │ EVIDENCE: verify-capacity.sh output │
  │ GATES: [email_infrastructure_v1,    │
  │         routing_catchall_v1,         │
  │         worker_live_v1,              │
  │         mailbox_indexed_v1]          │
  │ PROOF_LEVEL: V7                     │
  │ GRANTS: → can_signup_service(@X, *) │
  │         → can_receive_verify(@X)    │
  │ STACK: Cloudflare Email Routing     │
  │        + cmail worker               │
  │ DOCS: cmail/docs/EMAIL_VERIFICATION │
  │        Cloudflare Email Routing docs│
  └──────────────────┬──────────────────┘
                     │ GRANT: can_signup_service(@X, *)
                     │
═══════════════════════════════════════════════════════════════════════
PHASE 3: SOCIAL HANDLES (agent, autonomous — parallel)
═══════════════════════════════════════════════════════════════════════

  ┌────────────┬────────────┬────────────┬────────────┬────────────┐
  │  BLUESKY   │   GITHUB   │    npm     │  GITLAB    │  YOUTUBE   │
  │  🟢 FULL   │  🟡 SEMI   │ 🟢 FULL    │ 🟡 SEMI    │ 🟡 SEMI    │
  ├────────────┼────────────┼────────────┼────────────┼────────────┤
  │ CAP:       │ CAP:       │ CAP:       │ CAP:       │ CAP:       │
  │ have_      │ have_      │ have_      │ have_      │ have_      │
  │ handle     │ handle     │ handle     │ handle     │ handle     │
  │ (bluesky,  │ (github,   │ (npm,      │ (gitlab,   │ (youtube,  │
  │  @X)       │  @X)       │  @X)       │  @X)       │  @X)       │
  ├────────────┼────────────┼────────────┼────────────┼────────────┤
  │ EVIDENCE:  │ EVIDENCE:  │ EVIDENCE:  │ EVIDENCE:  │ EVIDENCE:  │
  │ atproto    │ GitHub     │ npm        │ GitLab     │ YouTube    │
  │ server     │ signup     │ profile    │ signup     │ channel    │
  │ .create    │ + email    │ API check  │ + email    │ creation   │
  │ Account    │ verify     │            │ verify     │ + OAuth    │
  ├────────────┼────────────┼────────────┼────────────┼────────────┤
  │ GATES:     │ GATES:     │ GATES:     │ GATES:     │ GATES:     │
  │ account_   │ handle_    │ handle_    │ handle_    │ channel_   │
  │ created_v1 │ owned_v1   │ owned_v1   │ owned_v1   │ created_v1 │
  ├────────────┼────────────┼────────────┼────────────┼────────────┤
  │ STACK:     │ STACK:     │ STACK:     │ STACK:     │ STACK:     │
  │ @atproto/  │ Playwright │ npm CLI    │ Playwright │ Google     │
  │ api        │ + mail.tm  │ or API     │ + mail.tm  │ OAuth +    │
  │ (direct)   │ (captcha)  │            │ (captcha)  │ YouTube    │
  │            │            │            │            │ Data API   │
  ├────────────┼────────────┼────────────┼────────────┼────────────┤
  │ DOCS:      │ DOCS:      │ DOCS:      │ DOCS:      │ DOCS:      │
  │ atproto    │ GitHub     │ npmjs.com  │ GitLab     │ YouTube    │
  │ docs       │ docs       │ /about     │ docs       │ Data API   │
  │ (create    │ (signup)   │ (packages) │ (signup)   │ v3 docs    │
  │  account)  │            │            │            │            │
  └─────┬──────┘ └─────┬────┘ └────┬─────┘ └─────┬────┘ └────┬─────┘
        │              │           │              │           │
        └──────────────┴───────────┴──────────────┴───────────┘
                               │
                    ALL GRANTS: have_handle(@X, platform)
                               │
═══════════════════════════════════════════════════════════════════════
PHASE 3b: MORE SOCIALS (parallel, some need phone)
═══════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │ CAPACITY: can_purchase_phone        │
  │ TYPE: human_action                  │
  │ CLAIM: "Human approved $X/mo"       │
  │ EVIDENCE: approval receipt          │
  │ GATES: [human_approved_v1]          │
  │ PROOF_LEVEL: V9                     │
  │ GRANTS: → have_phone(+X)            │
  │ STACK: Human queue                  │
  │ DOCS: cmail/docs/PHONE.md           │
  └──────────────────┬──────────────────┘
                     │ GRANT: have_phone(+X)
                     ▼
  ┌─────────────────────────────────────┐
  │ CAPACITY: have_phone(number)        │
  │ TYPE: infrastructure                │
  │ CLAIM: "Phone number owned"         │
  │ EVIDENCE: Telnyx API list response  │
  │ GATES: [phone_purchased_v1]         │
  │ PROOF_LEVEL: V7                     │
  │ GRANTS: → can_receive_sms(number)   │
  │         → can_verify_phone(number)  │
  │ STACK: Telnyx API                   │
  │ DOCS: cmail/docs/PHONE.md           │
  │        Telnyx API docs              │
  └──────────────────┬──────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
  ┌──────────┐              ┌──────────┐
  │  X/TWIT  │              │  TIKTOK  │
  │  🟡 SEMI │              │  🟡 SEMI │
  ├──────────┤              ├──────────┤
  │ CAP:     │              │ CAP:     │
  │ have_    │              │ have_    │
  │ handle   │              │ handle   │
  │ (x, @X)  │              │ (tiktok, │
  │          │              │  @X)     │
  ├──────────┤              ├──────────┤
  │ NEEDS:   │              │ NEEDS:   │
  │ phone    │              │ phone    │
  │ verify   │              │ verify   │
  ├──────────┤              ├──────────┤
  │ STACK:   │              │ STACK:   │
  │ Playwright│             │ TikTok   │
  │ + phone  │              │ private  │
  │ SMS      │              │ API +    │
  │          │              │ captcha  │
  └──────────┘              └──────────┘

═══════════════════════════════════════════════════════════════════════
PHASE 4: STORE DEPLOYMENT (agent + human, if selling)
═══════════════════════════════════════════════════════════════════════

  ┌─────────────────────────────────────┐
  │ CAPACITY: can_deploy_store(X)       │
  │ TYPE: infrastructure                │
  │ CLAIM: "Store X live + SSL + health"│
  │ EVIDENCE: DNS + SSL + health check  │
  │ GATES: [store_live_v1,              │
  │         ssl_valid_v1, health_ok_v1] │
  │ PROOF_LEVEL: V12                    │
  │ GRANTS: → can_process_orders(X)     │
  │         → can_collect_payment(X)    │
  │ STACK: Cloudflare Pages/Workers     │
  │        + Stripe/payment API         │
  │ DOCS: CF Pages docs, Stripe docs    │
  └─────────────────────────────────────┘
```

---

## Per-Capability Documentation Stack

Each capability has a `docs` field pointing to the exact documentation needed to resolve it.

```typescript
const CAPABILITY_DOCS: Record<string, DocStack> = {
  // Phase 0: Ideation
  "ideation_complete": {
    tools: ["cmail MCP: name.search", "cmail MCP: name.social"],
    docs: ["cmail/GUIDE.md#chapter-1", "cmail/GUIDE.md#chapter-2"],
    stack: "cmail worker (Cloudflare Workers)",
  },

  // Phase 1: Domain
  "have_domain": {
    tools: ["cmail MCP: name.cf_purchase", "cmail MCP: name.wire_email"],
    docs: [
      "cmail/docs/DOMAINS.md",
      "Cloudflare Registrar API docs",
      "Cloudflare Email Routing docs",
    ],
    stack: "Cloudflare Registrar + Email Routing",
    cost: "~$8-12/yr per domain",
    human_gate: "confirm_text: 'BUY {domain}'",
  },

  // Phase 2: Email
  "receive_email": {
    tools: ["verify-capacity.sh", "cmail MCP: email.list_mailboxes"],
    docs: [
      "cmail/docs/EMAIL_VERIFICATION.md",
      "Cloudflare Email Routing docs",
      "Cloudflare Email Service docs (for outbound)",
    ],
    stack: "Cloudflare Email Routing + cmail worker",
    gates: [
      "dns_valid_v1: dig MX + SPF",
      "cf_zone_active_v1: CF zone API",
      "email_infrastructure_v1: composite check",
      "routing_catchall_v1: CF routing rules API",
      "worker_live_v1: /api/stats",
      "mailbox_indexed_v1: email.list_mailboxes",
    ],
  },

  // Phase 3: Socials
  "have_handle:bluesky": {
    tools: ["@atproto/api: com.atproto.server.createAccount"],
    docs: ["https://atproto.com/guides/account-creation"],
    stack: "@atproto/api (npm package)",
    autonomy: "FULL — no captcha, direct API",
  },

  "have_handle:github": {
    tools: ["Playwright: github.com/signup", "cmail MCP: email.search (verify code)"],
    docs: [
      "https://docs.github.com/en/get-started",
      "GitHub signup flow docs",
    ],
    stack: "Playwright + cmail inbox (email verification)",
    autonomy: "SEMI — captcha on signup, email verify via cmail",
  },

  "have_handle:npm": {
    tools: ["npm CLI: npm adduser", "npm profile API"],
    docs: ["https://docs.npmjs.com/about-scopes", "https://docs.npmjs.com/packages-and-modules"],
    stack: "npm CLI or API",
    autonomy: "FULL — API-based signup possible",
  },

  "have_handle:gitlab": {
    tools: ["Playwright: gitlab.com/users/sign_up"],
    docs: ["https://docs.gitlab.com/ee/user/profile/"],
    stack: "Playwright + cmail inbox",
    autonomy: "SEMI — captcha on signup",
  },

  "have_handle:youtube": {
    tools: ["Google OAuth 2.0", "YouTube Data API v3"],
    docs: [
      "https://developers.google.com/youtube/v3",
      "https://developers.google.com/youtube/create-channel",
    ],
    stack: "Google Cloud Console + YouTube Data API v3",
    autonomy: "SEMI — need Google account first",
    notes: "YouTube channel creation requires WebView flow or manual step",
  },

  "have_handle:x": {
    tools: ["Playwright: x.com/i/flow/signup", "phone SMS verification"],
    docs: ["https://developer.x.com/en/docs"],
    stack: "Playwright + Telnyx SMS (phone verify)",
    autonomy: "SEMI — captcha + phone verification",
  },

  "have_handle:tiktok": {
    tools: ["TikTok private API or Playwright"],
    docs: ["https://developers.tiktok.com/"],
    stack: "TikTok private API + captcha solver",
    autonomy: "SEMI — captcha + possible phone verify",
  },

  "have_handle:instagram": {
    tools: ["Playwright: instagram.com/accounts/signup"],
    docs: ["https://developers.facebook.com/docs/instagram-api"],
    stack: "Playwright + cmail inbox + phone SMS",
    autonomy: "HARD — Meta captcha + phone + ToS risk",
    notes: "Instagram actively fights automation. Use only if essential.",
  },

  // Phase 3b: Phone
  "have_phone": {
    tools: ["cmail MCP: name.phone_purchase"],
    docs: [
      "cmail/docs/PHONE.md",
      "Telnyx API docs: https://developer.telnyx.com",
    ],
    stack: "Telnyx API",
    cost: "~$1/mo per number",
    human_gate: "confirm_text: 'PHONE {number}'",
  },

  // Phase 4: Store
  "can_deploy_store": {
    tools: ["Cloudflare Pages deploy", "Stripe API"],
    docs: [
      "Cloudflare Pages docs",
      "Stripe getting started docs",
    ],
    stack: "Cloudflare Pages + Workers + Stripe",
    proof_level: "V12",
  },
};
```

---

## LLM Resolution Order

The agent works **up the chain** — resolving capacities in dependency order:

```
STEP 1: Run ideation
  → name.search("mybrand") → see prices + handles
  → name.social("mybrand") → platform availability
  → IF name unavailable → restart with new name
  → IF name available → emit GRANT: can_purchase_domain("mybrand.com")

STEP 2: Queue human approval for domain
  → human_queue.add("Buy mybrand.com for $8.03", confirm_text="BUY mybrand.com")
  → WAIT for human approval

STEP 3: Domain purchase (after human approval)
  → name.cf_purchase(domain, confirmed=true)
  → name.wire_email(domain, confirmed=true)
  → verify-capacity.sh domain → CERTIFIED
  → QP receipt → capacity ACTIVE
  → emit GRANT: receive_email(*@mybrand.com)

STEP 4: Parallel social signups (all autonomous)
  → Bluesky: @atproto/api createAccount → have_handle:bluesky ✅
  → npm: npm adduser → have_handle:npm ✅
  → GitHub: Playwright signup → email verify via cmail → have_handle:github ✅
  → GitLab: Playwright signup → email verify via cmail → have_handle:gitlab ✅
  → YouTube: Google OAuth (if available) → have_handle:youtube ✅

STEP 5: Phone (if needed, human approval)
  → human_queue.add("Buy +1-XXX for $1/mo", confirm_text="PHONE +1-XXX")
  → WAIT for human approval
  → name.phone_purchase(number, confirmed=true)
  → have_phone(+1-XXX) → ACTIVE
  → emit GRANT: can_verify_phone(+1-XXX)

STEP 6: Phone-required socials
  → X: Playwright signup + SMS verify → have_handle:x ✅
  → TikTok: private API + captcha → have_handle:tiktok ✅

STEP 7: Mission complete
  → ALL capacities ACTIVE
  → ALL handles owned
  → ALL receipts in event store
  → Mission status: COMPLETE
```

---

## The Canonical Registry (D1 Schema)

```sql
CREATE TABLE IF NOT EXISTS qp_capacities (
  id TEXT PRIMARY KEY,              -- "cap:receive_email:agents@X"
  type TEXT NOT NULL,               -- "have_domain", "receive_email", etc.
  domain TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'unknown',  -- unknown/pending/active/failed
  proof_level INTEGER NOT NULL DEFAULT 0,  -- V0-V12
  claim_statement TEXT NOT NULL,    -- human-readable claim
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT
);

CREATE TABLE IF NOT EXISTS qp_grants (
  id TEXT PRIMARY KEY,              -- "grant:abc123"
  subject TEXT NOT NULL,            -- who receives the grant
  capability TEXT NOT NULL,         -- what action is authorized
  constraints TEXT NOT NULL DEFAULT '{}',  -- JSON: limits
  predicates TEXT NOT NULL DEFAULT '[]',   -- JSON: fact checks
  expiry TEXT,                      -- ISO timestamp
  minimum_proof_level INTEGER NOT NULL DEFAULT 0,
  signature TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',   -- active/expired/revoked
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qp_gates (
  id TEXT PRIMARY KEY,              -- "dns_valid_v1"
  runtime TEXT NOT NULL DEFAULT 'typescript',
  program_hash TEXT NOT NULL,       -- SHA-256 of verifier source
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qp_receipts (
  id TEXT PRIMARY KEY,              -- "receipt:abc123def456"
  protocol TEXT NOT NULL DEFAULT 'acom/0.1',
  transition_type TEXT NOT NULL DEFAULT 'RESOLVE',
  proof_level INTEGER NOT NULL,
  subject TEXT NOT NULL,            -- claim ID
  state_before TEXT NOT NULL,       -- JSON
  state_after TEXT NOT NULL,        -- JSON
  evidence_root TEXT NOT NULL,      -- Merkle root
  gates TEXT NOT NULL,              -- JSON array of gate results
  grant TEXT,                       -- JSON grant (if any)
  run TEXT NOT NULL,                -- JSON run metadata
  passed INTEGER NOT NULL,          -- 0/1
  signature TEXT NOT NULL DEFAULT '',
  signer TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qp_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,            -- JSON
  prev TEXT NOT NULL,               -- hash of previous entry
  hash TEXT NOT NULL                -- SHA-256 of (prev + type + canonical(payload))
);
```
