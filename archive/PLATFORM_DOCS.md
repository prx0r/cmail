# Social Platform Detection — How It Works

## Platform Detection Methods

| Platform | Method | Can Detect | Limitation |
|----------|--------|------------|------------|
| **GitHub** | REST API `api.github.com/users/{name}` | ✅ taken/available | Rate limit: 60 req/hr per IP. Cloudflare Workers share IPs → HTTP 403. |
| **X** | Page fetch + marker scan | ✅ taken/available | Returns 404 for available. JS-rendered but markers in initial HTML. |
| **YouTube** | Page fetch + marker scan | ✅ taken/available | Returns 404 for available. `"channelId":"UC"` = taken. |
| **Instagram** | Page fetch + marker scan | ⚠️ limited | **JS-rendered SPA.** Server returns 200 for ALL usernames (login page). No server-side markers. Needs headless browser. |
| **TikTok** | Page fetch + marker scan | ✅ taken/available | 200 + "couldn't find this account" = available. 200 + `"uniqueId":"name"` = taken. |
| **Twitch** | Page fetch + marker scan | ⚠️ limited | JS-rendered. Returns 200 with generic page. `"login":"name"` marker only appears sometimes. |
| **npm** | Registry API | ✅ taken/available | 200 = taken, 404 = available. Reliable. |
| **PyPI** | JSON API | ✅ taken/available | 200 = taken, 404 = available. Reliable. |
| **crates.io** | API | ✅ taken/available | 200 = taken, 404 = available. Reliable. |

## Why Instagram/Twitch Are Hard

**Instagram:** The server returns the same 200 response for EVERY username — it's a React SPA that renders client-side. The initial HTML contains no user data. Without a headless browser (Puppeteer/Playwright) or Instagram API credentials, we can't detect if an account exists.

**Twitch:** Similar SPA behavior. The initial HTML is a generic shell. The `"login":"name"` marker only appears in some responses. Not reliable enough for automated detection.

## Handle Rules (for suggestions)

| Platform | Allowed | Max Length | Notes |
|----------|---------|------------|-------|
| GitHub | `[a-z0-9-]` | 39 | Cannot start/end with hyphen |
| X | `[a-z0-9_]` | 15 | Underscore only, no hyphens |
| YouTube | `[a-z0-9_-]` | 30 | Underscore + hyphen allowed |
| Instagram | `[a-z0-9_.]` | 30 | Dot allowed (verified accounts) |
| TikTok | `[a-z0-9_.]` | 24 | Dot allowed |
| Twitch | `[a-z0-9_]` | 25 | Underscore only |
| npm | `[a-z0-9_-]` | 214 | URL-safe characters |
| PyPI | `[a-z0-9_-]` | varies | PEP-normalized |
| crates.io | `[a-z0-9_-]` | varies | Lowercase only |

## Hyphens in Handles

**GitHub:** ✅ YES — `a-task` is valid
**YouTube:** ✅ YES — `a-task` is valid
**X:** ❌ NO — hyphens not allowed, use `a_task` or `atask`
**Instagram:** ❌ NO — hyphens not allowed, use `atask` or `a.task`
**TikTok:** ❌ NO — hyphens not allowed, use `atask`
**npm:** ✅ YES — `a-task` is valid
**PyPI:** ✅ YES — `a-task` is valid (normalized to `a-task`)
**crates.io:** ✅ YES — `a-task` is valid

## Current Detection Results

### greatcontinue
| Platform | Status | How |
|----------|--------|-----|
| GitHub | ❓ HTTP 403 | Rate limited — check manually |
| X | ✅ available | 404 response |
| YouTube | ✅ available | 404 response |
| Instagram | ❓ unknown | JS-rendered SPA |
| TikTok | ❓ unknown | No signal in page |
| Twitch | ❓ unknown | JS-rendered SPA |
| npm | ✅ available | 404 response |
| PyPI | ✅ available | 404 response |
| crates.io | ✅ available | 404 response |

### hamharness
| Platform | Status | How |
|----------|--------|-----|
| GitHub | ❓ HTTP 403 | Rate limited |
| X | ✅ available | 404 |
| YouTube | ✅ available | 404 |
| Instagram | ❓ unknown | JS-rendered |
| TikTok | ✅ available | "not found" marker |
| Twitch | ❓ unknown | JS-rendered |
| npm | ✅ available | 404 |
| PyPI | ✅ available | 404 |
| crates.io | ✅ available | 404 |

### hamtask
| Platform | Status | How |
|----------|--------|-----|
| GitHub | ✅ available | 404 |
| X | ✅ available | 404 |
| YouTube | ❌ taken | channelId marker |
| Instagram | ❓ unknown | JS-rendered |
| TikTok | ✅ available | "not found" marker |
| Twitch | ❓ unknown | JS-rendered |
| npm | ✅ available | 404 |
| PyPI | ❌ taken | 200 response |
| crates.io | ✅ available | 404 |
