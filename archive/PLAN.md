# NORTHSTAR — Autonomous Name Acquisition Pipeline

> Agent types "postagi" → sees all domains + handles → buys domain → wires email → provisions phone → receives SMS → signs up for accounts.

## Architecture

```
Domain Hunter (UI + RDAP engine, 1208 TLDs)
  + our tools (handles, CF purchase, email wiring, Telnyx)
  + Namecheap MCP (registration, DNS, purchase links)
  → unified MCP server → agent or human
```

## A-Tasks Registry

| ID | Task | Validation | Status |
|----|------|------------|--------|
| A1 | Clone Namecheap MCP, verify registration works | `namecheap_register_domain` tool exists in MCP | pending |
| A2 | Add Namecheap tools to Domain Hunter MCP server | `list_domains`, `check_domains`, `register_domain` in tools/list | pending |
| A3 | Add our handle checks to Domain Hunter Social tab | 9 platforms return status in Social tab | pending |
| A4 | Deploy unified MCP server | `curl /mcp` returns all tools | pending |
| A5 | Build Namecheap-style UI on Domain Hunter shell | Search → table with TLD, status, price, buy link | pending |
| A6 | Deploy unified UI | `curl /` returns HTML, search works | pending |
| A7 | End-to-end test: postagi across everything | Full pipeline log with evidence | pending |
| A8 | Git init + organize repos | `git status` clean, AGENTS.md exists | pending |

## H-Tasks (Human)

| ID | Task | Unlocks | Status |
|----|------|---------|--------|
| H1 | Enable Namecheap API access (20+ domains or $50 balance) | A1 registration | pending |
| H2 | Whitelist server IP for Namecheap API | A1 registration | pending |
| H3 | Set Namecheap API credentials in vault | A1 registration | pending |
| H4 | Set TELNYX_API_KEY in vault | Phone provisioning | pending |

## M-Tasks (Money)

| ID | Task | Cost | Approval | Status |
|----|------|------|----------|--------|
| M1 | Buy postagi.trade via Cloudflare | $4.18 | human confirm | pending |
| M2 | Buy postagi via Namecheap | ~$10 | human confirm | pending |

---

## A-Task Details

### A1: Clone Namecheap MCP
**What:** Clone fantomdancer/mcp-namecheap, verify tools work
**Validation:**
```bash
# Must return 10 tools including namecheap_register_domain
curl -s http://localhost:PORT/mcp -d '{"method":"tools/list"}' | jq '.result.tools | length' | grep -q "10"
```
**Evidence:** tool list output

### A2: Add Namecheap tools to Domain Hunter MCP
**What:** Register Namecheap tools in Domain Hunter's MCP server
**Validation:**
```bash
# Must have check_availability, get_prices, generate_names, find_domains, list_zones, namecheap_list_domains, namecheap_check_domains, namecheap_register_domain
curl -s .../mcp -d '{"method":"tools/list"}' | jq '.result.tools[].name' | grep "namecheap"
```
**Evidence:** tool list with namecheap tools

### A3: Handle checks in Social tab
**What:** Add our 9-platform handle checking to Domain Hunter's Social tab
**Validation:**
- Social tab shows GitHub, X, YouTube, Instagram, TikTok, Twitch, npm, PyPI, crates
- Each returns taken/available/unknown
**Evidence:** screenshot or API response

### A4: Deploy unified MCP
**What:** Deploy Domain Hunter + our tools + Namecheap as one worker
**Validation:**
```bash
curl -s https://unified-worker.workers.dev/mcp | jq '.tools | length' | grep -q "[0-9]"
```
**Evidence:** HTTP response

### A5: Namecheap-style UI
**What:** Search "postagi" → table shows all TLDs with prices from multiple registrars
**Validation:**
- Search input works
- Results table shows domain, status, price, buy link
- Available domains sorted to top
**Evidence:** curl or browser test

### A6: Deploy UI
**What:** Deploy the Svelte UI as a Cloudflare Worker
**Validation:**
```bash
curl -s https://site.workers.dev/ | grep -q "domain"
```
**Evidence:** HTTP response

### A7: E2E test
**What:** Run full pipeline: search → check handles → check CF price → preview purchase → preview email wiring
**Validation:**
- `name.search` returns domains with prices
- `name.check_handles` returns 9 platform results
- `name.cf_check` returns price
- `name.cf_purchase` preview shows price
- `name.wire_email` preview shows plan
**Evidence:** full test log

### A8: Git init + organize
**What:** Initialize git repos, create AGENTS.md, organize stale folders
**Validation:**
- `git log` shows clean history
- AGENTS.md exists with tool references
- No untracked critical files
**Evidence:** git status output
