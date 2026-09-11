# Socials — handle checking + signup automation

## Check (free, automated)
- `name.check_handles` — 9 platforms via status-code/marker checks
  (GitHub, X, YouTube, TikTok, Twitch, npm, PyPI, crates.io).
- `name.social` — merges local checks + Apify actor
  (`corent1robert~social-handle-checker`, needs APIFY_TOKEN) + suggestions.
- **Manual-only 5** (Meta blocks automation; Reddit/Twitch unreliable):
  Instagram, Facebook, Threads, Reddit, Twitch — tool returns `unknown` +
  direct check link. A human clicks these; queue with links, never skip silently.

## Signup automation (stevejobless publisher)
7 native adapters + queue + scheduler with 3-strike retry:
`publisher/adapters/{bluesky,facebook,instagram,linkedin,tiktok,twitter,youtube}.py`.
Flow: queue post (draft) → human approves sends → scheduler publishes →
external_id recorded. Credentials live in `SocialAccount` rows (OAuth/app
tokens — several platforms need human OAuth clicks or app review).

## Content loop (the actual product)
Job completion → review ask → before/after assets → drafted posts →
approved sends. Never auto-post; drafts + proposes, human confirms.

## Agent notes
- Report per-platform status honestly: taken / available / unknown+link.
- Never claim a handle is secured without a logged-in confirmation or receipt.
- Free handles first (GitHub, npm, Bluesky…); manual five queued with links.
