# Future Plans — setup.social

## The One Thing We Do

**We prove that autonomous agent actions actually happened.**

Not "the agent said it worked." Not "the API returned 200." We prove, deterministically, that:
- A video exists on YouTube with the right title, right channel, right visibility
- A post exists on Instagram with the right content
- A domain is owned by the right account
- Money was spent on the right thing for the right price

That's it. We don't do scheduling. We don't do content creation. We don't do analytics dashboards. **We prove.**

## Why This Is a Business

### The Trust Problem

Every autonomous agent today operates on trust:

```
Agent: "I posted your video to YouTube"
Human: "Did it actually work?"
Agent: "YouTube returned HTTP 200"
Human: "But is it actually public? Is it on the right channel?"
Agent: "..."
```

There is no proof. The agent said it worked. The API said it worked. But nobody independently verified that the observable world matches the claimed state.

### Our Solution

```
Agent: "I posted your video to YouTube"
QP:    "I independently verified via Google's API that:
        - Video abc123 exists on channel UCxxx
        - Title matches: 'My Video'
        - Visibility is: PUBLIC
        - Processing status: SUCCEEDED
        - Published at: 2026-09-17T15:30:00Z"
Human: "Proof received. I trust this."
```

### Why People Pay

| Without setup.social | With setup.social |
|---------------------|-------------------|
| "The agent said it worked" | "Here's cryptographic proof it worked" |
| "I hope the tokens are safe" | "Tokens never leave the server" |
| "Did we actually post everywhere?" | "Here's a receipt for every platform" |
| "How much did we spend?" | "Here's every transaction, cryptographically signed" |
| "Is the content actually live?" | "Here's the independent readback from each platform" |

**Proof of spend** = every dollar spent has a signed receipt, a verified platform state, and an independent readback.

**Security** = credentials never touch the browser, never touch the agent, never touch the open internet. They live in an encrypted vault inside the MCP server.

## What We Are (And What We're Not)

### We ARE:
- A **proof layer** that sits between agents and social platforms
- A **security boundary** that keeps credentials in a vault
- A **verification service** that independently confirms platform state
- A **receipt system** that cryptographically signs every action

### We are NOT:
- A social media management tool (that's Postiz, Buffer, Hootsuite)
- A content creation tool (that's Canva, Adobe, etc.)
- A scheduling tool (that's commodity)
- An analytics dashboard (platforms already have this)

### Our Position

```
Existing tools:     "We posted it"
Us:                  "We can PROVE it happened, and here's the receipt"
```

We plug INTO existing stacks. We don't replace them.

```
Content creator → creates video
  → Scheduler (Postiz/Buffer) → posts at optimal time
    → setup.social → proves it exists, generates receipt
      → Analytics → measures performance (with proven data)
```

## The Product

### MVP: Proof of Social Presence

**What it does:** Given a handle + platforms, proves that accounts exist and content is live.

**What it doesn't do:** Post content, schedule posts, create content, manage accounts.

**Input:**
```json
{
  "handle": "mxthartist",
  "platforms": ["youtube", "instagram", "tiktok", "x"]
}
```

**Output:**
```json
{
  "handle": "mxthartist",
  "platforms": {
    "youtube": {
      "status": "PROVEN",
      "channel_id": "UCxxx",
      "subscriber_count": 1234,
      "video_count": 5,
      "proof_receipt": "receipt:abc123...",
      "verified_at": "2026-09-17T15:30:00Z"
    },
    "instagram": {
      "status": "PROVEN",
      "account_id": "12345",
      "post_count": 10,
      "proof_receipt": "receipt:def456...",
      "verified_at": "2026-09-17T15:30:05Z"
    }
  },
  "total_cost": 0,
  "receipts": ["receipt:abc123...", "receipt:def456..."]
}
```

### Phase 2: Proof of Post

**What it does:** Given a post request, executes it and proves the result.

**Input:**
```json
{
  "action": "video.publish",
  "platform": "youtube",
  "channel_id": "UCxxx",
  "title": "My Video",
  "visibility": "public",
  "artifact": "sha256:VIDEO123"
}
```

**Output:**
```json
{
  "status": "PROVEN",
  "video_id": "abc123",
  "url": "https://youtube.com/watch?v=abc123",
  "title_bound": true,
  "visibility_public": true,
  "processing_complete": true,
  "proof_receipt": "receipt:ghi789...",
  "cost": 0
}
```

### Phase 3: Proof of Spend

**What it does:** Every transaction has a cryptographically signed receipt.

**Output:**
```json
{
  "transaction_id": "txn_abc123",
  "action": "domain.purchase",
  "domain": "mxthartist.com",
  "cost": 10.46,
  "currency": "USD",
  "provider": "cloudflare",
  "receipt": "receipt:jkl012...",
  "grant_id": "grant:mno345...",
  "signature": "ed25519:..."
}
```

## Architecture (Closed Source)

```
┌─────────────────────────────────────────────────────┐
│  setup.social MCP SERVER (closed source)             │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ QP KERNEL                                        │  │
│  │ • Actuality (TRUE/FALSE/UNKNOWN)                 │  │
│  │ • Claims, Evidence, Judges, Gates                │  │
│  │ • Grants (Ed25519 signed)                        │  │
│  │ • TransitionReceipts (append-only)               │  │
│  │ • Replay verifier                                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ EFFECT GATEWAY                                   │  │
│  │ • validate grant → reserve → execute → readback  │  │
│  │ • NO direct provider mutators                    │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ SOCIAL EXECUTORS                                │  │
│  │ • YouTube (Google API)                           │  │
│  │ • Instagram (Meta Graph API)                     │  │
│  │ • TikTok (Content Posting API)                   │  │
│  │ • X (API v2)                                     │  │
│  │ • Facebook (Meta bundle)                         │  │
│  │ • WhatsApp (Meta bundle)                         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ VAULT (encrypted)                               │  │
│  │ • OAuth tokens (never exposed)                  │  │
│  │ • API keys (never exposed)                      │  │
│  │ • Signed receipts (append-only)                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  MCP INTERFACE                                        │
│  • Agent connects here                               │
│  • Never sees credentials                             │
│  • Gets capabilities, not tokens                      │
└─────────────────────────────────────────────────────┘
         │
         │ MCP Protocol
         │
┌─────────────────────────────────────────────────────┐
│  AGENT (user's existing stack)                       │
│  • Connects via MCP                                  │
│  • Requests: "prove mxthartist exists on YouTube"    │
│  • Receives: QP receipt with proof                   │
│  • Never handles credentials                         │
└─────────────────────────────────────────────────────┘
         │
         │
┌─────────────────────────────────────────────────────┐
│  HUMAN                                               │
│  │                                                   │
│  ├─→ Dashboard (approval only)                       │
│  │   • Connect accounts (OAuth)                      │
│  │   • Approve purchases                             │
│  │   • View proofs                                   │
│  │                                                   │
│  └─→ Chat with agent                                 │
│      "Set up mxthartist everywhere"                  │
└─────────────────────────────────────────────────────┘
```

## Why Closed Source

1. **Security** — The QP kernel is the trust boundary. Open-sourcing it exposes the verification logic to tampering.
2. **Proof of value** — The proof system IS the product. If it's open, anyone can copy it.
3. **Revenue protection** — The OAuth credential management and platform app approvals are expensive to maintain.
4. **Enterprise trust** — Enterprises pay for closed-source security tools, not open-source ones.

## Why Paid

1. **We maintain developer apps** — Facebook, YouTube, Instagram approval is expensive and time-consuming
2. **We handle token refresh** — OAuth tokens expire; we keep them fresh
3. **We provide the proof layer** — This is unique value no one else offers
4. **We maintain the MCP server** — Infrastructure costs money

## Pricing (Proposed)

| Tier | Price | What You Get |
|------|-------|-------------|
| **Free** | $0 | Self-hosted MCP server, basic proofs, community support |
| **Pro** | $29/mo | Hosted MCP, full dashboard, 100 proofs/month, email support |
| **Enterprise** | $99/mo | Custom MCP, unlimited proofs, SLA, dedicated support |

## Technical Roadmap

### Phase 1: Proof of Social Presence (Current)
- ✅ QP kernel (Actuality, Claims, Evidence, Judges, Grants, Receipts)
- ✅ Effect gateway (constitutional boundary)
- ✅ YouTube adapter (OAuth + readback + analytics)
- ✅ 13 ProofSpecs
- ✅ Adversarial tests
- ⏳ Instagram adapter
- ⏳ TikTok adapter
- ⏳ X adapter

### Phase 2: Proof of Post
- ⏳ Post execution through effect gateway
- ⏳ Independent readback for each platform
- ⏳ Content hash verification
- ⏳ Privacy state verification

### Phase 3: Proof of Spend
- ⏳ Transaction receipts
- ⏳ Cost tracking
- ⏳ Budget enforcement
- ⏳ Audit trail

### Phase 4: Product
- ⏳ MCP server packaging (closed source)
- ⏳ Approval dashboard (minimal web)
- ⏳ OAuth connection flow
- ⏳ Billing (Stripe)
- ⏳ Authentication (API keys, JWT)

### Phase 5: Scale
- ⏳ Multi-tenant MCP server
- ⏳ Analytics on proof data
- ⏳ Platform relationship management
- ⏳ Enterprise features
