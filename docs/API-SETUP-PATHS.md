# API Setup Paths — The Big 4

## Overview

Each platform API requires a setup chain. Some steps are agent-automated, some need human action. This document maps every step.

```
SHARED PREREQUISITE:
  👤 Human creates accounts on each developer platform
  (Google, Meta, TikTok, X — one-time, ~5 min each)
  ↓
AGENT then automates everything else using those credentials
```

---

## YouTube (Google)

### Chain
```
👤 1. Create Google Account (agents@{domain})
     ↓
👤 2. Create Google Cloud Project
     → console.cloud.google.com → New Project
     ↓
👤 3. Enable APIs
     → YouTube Data API v3
     → YouTube Analytics API
     ↓
👤 4. Create OAuth 2.0 credentials
     → APIs & Services → Credentials → Create OAuth client ID
     → Type: Desktop app
     → Download client_secret.json
     ↓
🟢 5. Agent: First OAuth flow
     → Open auth URL in browser
     → Human logs in with agents@{domain}
     → Agent captures auth code → exchanges for tokens
     → Store refresh_token in vault
     ↓
🟢 6. Agent: Create YouTube channel
     → Navigate to youtube.com → Create channel
     ↓
🟢 7. Agent: Verify API works
     → GET /youtube/v3/channels?mine=true
     → GET /youtubeanalytics.googleapis.com/v2/reports?metrics=views
```

### What Human Does
- Steps 1-4: Create accounts and project (~5 min one-time)
- Step 5: Log in to Google OAuth once

### What Agent Does
- Steps 5-7: OAuth flow, channel creation, API verification

### Credentials Stored
```
GOOGLE_CLIENT_ID       → vault
GOOGLE_CLIENT_SECRET   → vault
GOOGLE_REFRESH_TOKEN   → vault
YOUTUBE_CHANNEL_ID     → vault (after channel creation)
```

### API Ready When
- `channels.list?mine=true` returns channel data
- `reports.query` returns analytics data

---

## Instagram (Meta Business)

### Chain
```
👤 1. Create Meta Business account
     → business.facebook.com → Create Account
     ↓
👤 2. Create Facebook Page
     → Business Settings → Pages → Add New
     ↓
👤 3. Create Facebook Developer App
     → developers.facebook.com → Create App
     → Type: Business
     → Add Instagram product
     ↓
👤 4. Configure Facebook Login for Business
     → App Dashboard → Products → Facebook Login → Settings
     ↓
👤 5. Link Instagram Business Account
     → Connect Instagram to Facebook Page
     → Convert to Business/Creator account
     ↓
🟢 6. Agent: Get access tokens
     → Graph API Explorer → generate user access token
     → Get Page access token
     → Get Instagram Business Account ID
     ↓
🟢 7. Agent: Verify API works
     → GET /me?fields=id,name
     → GET /{ig-user-id}?fields=media_count,followers_count
```

### What Human Does
- Steps 1-5: Create Meta accounts and link Instagram (~15 min)

### What Agent Does
- Steps 6-7: Token generation, API verification

### Credentials Stored
```
META_APP_ID            → vault
META_APP_SECRET        → vault
META_ACCESS_TOKEN      → vault (short-lived, refresh needed)
META_PAGE_ID           → vault
INSTAGRAM_BUSINESS_ID  → vault
```

### API Ready When
- `GET /{ig-user-id}?fields=media_count` returns data
- Can create media containers and publish

---

## TikTok

### Chain
```
👤 1. Create TikTok Developer account
     → developers.tiktok.com → Sign up
     ↓
👤 2. Create App
     → Manage Apps → Create App
     → Add products: Login Kit + Content Posting API
     ↓
👤 3. Enable Direct Post
     → Content Posting API settings → Enable Direct Post
     ↓
👤 4. Request scopes
     → video.publish scope (required for posting)
     ↓
👤 5. Submit for review (optional — for public posting)
     → Without audit: posts are private only
     → With audit: posts are public
     ↓
🟢 6. Agent: OAuth flow
     → Build auth URL with client_key + scopes
     → Human logs in → agent captures code
     → Exchange for access_token + refresh_token
     ↓
🟢 7. Agent: Verify API works
     → POST /v2/post/publish/creator_info/query/
     → Check creator info returned
```

### What Human Does
- Steps 1-5: Create TikTok developer account and app (~10 min)
- Step 5: Submit for audit if public posting needed

### What Agent Does
- Steps 6-7: OAuth flow, API verification

### Credentials Stored
```
TIKTOK_CLIENT_KEY      → vault
TIKTOK_CLIENT_SECRET   → vault
TIKTOK_ACCESS_TOKEN    → vault
TIKTOK_REFRESH_TOKEN   → vault
TIKTOK_OPEN_ID         → vault
```

### API Ready When
- `creator_info/query` returns creator data
- Can init video/photo posts

### Important
- Unaudited apps: content is **private only**
- Audit can take days to weeks
- 6 requests/min rate limit on video init

---

## X (Twitter)

### Chain
```
👤 1. Create X Developer account
     → developer.x.com → Apply
     ↓
👤 2. Create Project
     → Projects & Apps → New Project
     → Name, use case, description
     ↓
👤 3. Create App
     → Add App to project
     → Choose tier: Free / Basic ($200/mo) / Pro ($5000/mo)
     ↓
👤 4. Configure OAuth 2.0
     → App Settings → User authentication settings
     → Type: Automated App / Bot
     → Permissions: Read + Write
     → Callback URL: http://127.0.0.1:8080/callback
     ↓
👤 5. Generate credentials
     → Keys and tokens → Generate
     → Client ID + Client Secret (OAuth 2.0)
     → API Key + API Secret (OAuth 1.0a — deprecated)
     → Bearer Token (app-only)
     ↓
🟢 6. Agent: OAuth 2.0 PKCE flow
     → Build auth URL with client_id + scopes
     → Human logs in → agent captures code
     → Exchange code + code_verifier for tokens
     ↓
🟢 7. Agent: Verify API works
     → GET /2/users/me
     → POST /2/tweets (test tweet)
```

### What Human Does
- Steps 1-5: Create X developer account and app (~10 min)

### What Agent Does
- Steps 6-7: OAuth flow, API verification

### Credentials Stored
```
X_CLIENT_ID           → vault
X_CLIENT_SECRET       → vault
X_API_KEY             → vault (OAuth 1.0a — legacy)
X_API_SECRET          → vault (OAuth 1.0a — legacy)
X_BEARER_TOKEN        → vault (app-only)
X_ACCESS_TOKEN        → vault (user context)
X_REFRESH_TOKEN       → vault
```

### API Ready When
- `GET /2/users/me` returns user data
- Can create tweets

### Important
- Free tier: 50 tweets/mo write, 1500 reads/mo
- Basic: $200/mo for 3000 writes, 50k reads
- Owned Reads: $0.001/resource (your own data)

---

## Unified Setup Order

The optimal order for setting up all 4 APIs:

```
DAY 1: Human creates accounts (parallel)
  ├─ Google Cloud Console → YouTube API project
  ├─ Meta Business Manager → Instagram app
  ├─ TikTok Developer → Content Posting app
  └─ X Developer → API project

DAY 1: Agent runs OAuth flows (parallel)
  ├─ YouTube: OAuth → refresh_token
  ├─ Instagram: Graph API token
  ├─ TikTok: OAuth → access_token
  └─ X: OAuth 2.0 PKCE → tokens

DAY 2+: Agent verifies all APIs work
  ├─ YouTube: channels.list + reports.query
  ├─ Instagram: /me + /{ig-id}/media
  ├─ TikTok: creator_info/query
  └─ X: /2/users/me
```

## Human Action Summary

| Platform | Steps | Time | One-time? |
|----------|-------|------|-----------|
| YouTube | Create Google account + Cloud project + OAuth creds | ~5 min | Yes |
| Instagram | Create Meta Business + FB Page + FB App + link Instagram | ~15 min | Yes |
| TikTok | Create developer account + app + enable Content Posting | ~10 min | Yes |
| X | Create developer account + project + app + configure OAuth | ~10 min | Yes |
| **Total** | | **~40 min** | **Yes** |

After initial setup, everything is agent-automated. Human only re-enters for:
- TikTok audit submission (if public posting needed)
- Token refresh (if refresh tokens expire — usually long-lived)
