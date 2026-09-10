# Apify Integration Log

## Actors Tested

| Actor | ID | What It Does | Result | Cost |
|-------|-----|--------------|--------|------|
| `corent1robert~instagram-handle-checker` | corent1robert/instagram-handle-checker | Instagram-only bulk check | ❌ `request_failed` for all handles | $0.08/20 handles |
| `corent1robert~social-handle-checker` | corent1robert/social-handle-checker | 15 platforms in one run | ✅ **WORKS** — 15 platforms, only Meta ones error | $0.12/20 handles |
| `goat255~instagram-username-availability-checker` | goat255/instagram-username-availability-checker | Instagram + profile intel | ⏳ Ran for 80s+ then timed out — no results | Unknown |

## What Works

### ✅ `corent1robert~social-handle-checker` (USE THIS)
- **Coverage:** Instagram, TikTok, Facebook, Pinterest, YouTube, X/Twitter, Threads, GitHub, Snapchat, Twitch, Reddit, Bluesky, Telegram, GitLab, SoundCloud
- **Input:** `{ "handles": ["name1", "name2"], "coverage": "all" }`
- **Output:** Per-handle: `available_instagram: yes/no/error`, `confidence_instagram: high/low`
- **API endpoint:** `POST https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs?token=TOKEN`
- **Poll:** `GET https://api.apify.com/v2/acts/corent1robert~social-handle-checker/runs/RUN_ID?token=TOKEN`
- **Results:** `GET https://api.apify.com/v2/datasets/DATASET_ID/items?token=TOKEN`
- **Pricing:** Free: 20 handles/run. Paid: $3.10/1k handles.
- **Limitations:** Instagram, Facebook, Threads, Reddit return `error` (Meta blocks Apify too)

### ❌ `corent1robert~instagram-handle-checker` (DON'T USE)
- Returns `request_failed` for every handle
- Instagram-specific but broken

### ❌ `goat255~instagram-username-availability-checker` (DON'T USE)
- Runs for 80+ seconds then produces no results
- Timeout issues

## Platform Detection Summary

| Platform | Method | Reliable? | Notes |
|----------|--------|-----------|-------|
| GitHub | REST API | ✅ Yes | Rate limited from Worker IPs (403) |
| X | Page fetch | ✅ Yes | 404 = available |
| YouTube | Page fetch | ✅ Yes | 404 = available |
| TikTok | Page fetch + markers | ✅ Yes | "not found" in body = available |
| Twitch | Page fetch | ⚠️ Sometimes | JS-rendered, unreliable |
| npm | Registry API | ✅ Yes | 200=taken, 404=available |
| PyPI | JSON API | ✅ Yes | 200=taken, 404=available |
| crates.io | API | ✅ Yes | 200=taken, 404=available |
| Snapchat | Apify | ✅ Yes | Via social-handle-checker |
| Bluesky | Apify | ✅ Yes | Via social-handle-checker |
| Telegram | Apify | ✅ Yes | Via social-handle-checker |
| GitLab | Apify | ✅ Yes | Via social-handle-checker |
| SoundCloud | Apify | ✅ Yes | Via social-handle-checker |
| Pinterest | Apify | ✅ Yes | Via social-handle-checker |
| Instagram | Apify | ❌ Error | Meta blocks all automated access |
| Facebook | Apify | ❌ Error | Meta blocks all automated access |
| Threads | Apify | ❌ Error | Meta blocks all automated access |
| Reddit | Apify | ❌ Error | Apify can't access |

## Pricing (as of 2026-09-10)

| Plan | Handles/run | Cost per 1k |
|------|-------------|-------------|
| Free | 20 | $5/mo credit |
| Bronze | unlimited | $5.28 |
| Silver | unlimited | $4.56 |
| Gold | unlimited | $3.72 |

## API Token
- Vault: `APIFY_TOKEN` in `oracle` vault
- Format: `apify_api_kR3zy...`
- Set as Cloudflare Worker secret: `APIFY_TOKEN`

## Don't Try Again
- ❌ `corent1robert~instagram-handle-checker` — broken
- ❌ `goat255~instagram-username-availability-checker` — timeout
- ❌ Any Instagram-specific Apify actor — Meta blocks them all
- ❌ Direct Instagram API (`/api/v1/users/web_profile_info/`) — requires login
- ❌ Instagram GraphQL (`?__a=1`) — requires login
- ❌ Instagram password reset endpoint — returns 403
