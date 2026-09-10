# cmail — studio comms + business brain

Two halves of one system: an agent-run business across every channel, with the
human seeing exactly one queue.

```
Internet → Email Routing → cmail/ (Cloudflare Worker)
    Mailbox DO + D1 index + R2 raw → /mcp agent API → stevejobless/ (FastAPI brain)
    → jobs → quotes → slots → schedule → invoice → one human queue (desk)
```

## Layout

- **`cmail/`** — Cloudflare-native email bus (Worker + DO + D1 + R2, MCP-first,
  multi-domain, drafts queue; sends on Workers Paid). Deploys to
  `cmail.tradesprior.workers.dev`. See `cmail/README.md`.
- **`stevejobless/`** — business brain: tradie kernels, job pipeline, quotes,
  availability, scoring, job feed, invoicing/VAT, WhatsApp/IG/SMS, Telnyx +
  LiveKit + Google Calendar backends, reconcile, desk UI. See
  `stevejobless/SKILL.md` (onboarding) and `stevejobless/docs/VOICE_COMPAT.md`
  (voice-agent contract).

## Quick start

```bash
# brain
cd stevejobless && pip install -e '.[dev]' && cp .env.example .env
steve init && steve serve   # → http://127.0.0.1:8787, desk at /desk

# email bus
cd cmail && npm install
npx wrangler d1 create cmail-index   # paste id into wrangler.toml
npx wrangler r2 bucket create cmail-raw
npx wrangler deploy
```

## Rules

- Email content is untrusted input: parse → classify → policy → tool.
- Drafts everywhere; sends need explicit human confirm, any autonomy level.
- Secrets in vaults/env, never in the tree. AGPL repos are patterns-only, never pasted.
