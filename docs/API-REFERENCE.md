# API Reference: The Big 4

## YouTube Data API v3

### Setup
1. Create Google Cloud Project → console.cloud.google.com
2. Enable: YouTube Data API v3, YouTube Analytics API
3. Create OAuth 2.0 credentials (Desktop app type)
4. First auth: user logs in → agent gets refresh_token

### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/youtube/v3/channels?part=snippet,statistics&mine=true` | GET | Get authenticated user's channel |
| `/youtube/v3/search?part=snippet&q={query}` | GET | Search videos |
| `/youtube/v3/videos?part=snippet,statistics&id={id}` | GET | Get video details |
| `/youtube/v3/playlists?part=snippet&mine=true` | GET | List user's playlists |
| `/youtube/v3/videos?part=snippet,status` | POST | Upload video |
| `/youtube/v3/captions?part=snippet` | POST | Upload captions |

### Quota
- Default: 10,000 units/day
- `search.list`: 1 unit
- `videos.insert` (upload): 1 unit
- `videos.list`: 1 unit
- `channels.list`: 1 unit

### OAuth Scopes
- `youtube` — manage account
- `youtube.upload` — upload videos
- `youtube.readonly` — read account
- `yt-analytics.readonly` — read analytics

### Analytics API
```
GET https://youtubeanalytics.googleapis.com/v2/reports
  ?ids=channel==MINE
  &startDate=2026-01-01
  &endDate=2026-09-17
  &metrics=views,likes,subscribersGained,estimatedMinutesWatched
  &dimensions=day
  &sort=-day
```

### Client Libraries
- Python: `pip install google-api-python-client google-auth-oauthlib`
- Node: `npm install googleapis`
- Official: https://developers.google.com/youtube/v3/libraries

---

## Instagram Graph API (via Meta Business)

### Setup
1. Create Meta Business account → business.facebook.com
2. Create Facebook Page (auto-linked)
3. Convert to Business/Creator account
4. Connect Instagram account
5. Create Facebook App → developers.facebook.com
6. Get Instagram Graph API access token

### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /me` | GET | Get business account info |
| `GET /{ig-user-id}/media` | GET | List posts |
| `GET /{ig-user-id}/stories` | GET | List stories |
| `POST /{ig-user-id}/media` | POST | Create media container |
| `POST /{ig-user-id}/media_publish` | POST | Publish post |
| `GET /{ig-user-id}/insights` | GET | Account analytics |
| `POST /{ig-media-id}/insights` | POST | Media analytics |

### OAuth Scopes
- `instagram_basic` — read profile + media
- `instagram_content_publish` — create + publish
- `instagram_manage_comments` — manage comments
- `instagram_manage_messages` — DMs

### Limitations
- Only works with Business/Creator accounts
- Media must be uploaded as containers first, then published
- Rate limit: 200 calls/user/hour

### Client Libraries
- Official: https://github.com/facebook/facebook-python-business-sdk
- Graph API Explorer: https://developers.facebook.com/tools/explorer

---

## TikTok Content Posting API

### Setup
1. Register app → developers.tiktok.com
2. Add "Content Posting API" product to app
3. Enable "Direct Post" configuration
4. Get `video.publish` scope approved
5. User authorizes via Login Kit → get access_token

### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /v2/post/publish/creator_info/query/` | POST | Get creator info |
| `POST /v2/post/publish/video/init/` | POST | Init video post |
| `POST /v2/post/publish/content/init/` | POST | Init photo post |
| `POST /v2/post/publish/status/fetch/` | POST | Check post status |

### Posting Flow
```
1. Query creator info (get privacy options, max duration)
2. Init video upload (FILE_UPLOAD or PULL_FROM_URL)
3. If FILE_UPLOAD: PUT video to upload_url
4. Poll status/fetch until published
```

### Limitations
- Unaudited apps: content restricted to private viewing
- Must pass audit to make content public
- Video formats: MP4 + H.264
- Max duration: 300 seconds (5 min)

### Auth
- Login Kit → OAuth → access_token
- Token endpoint: `POST /v2/oauth/token/`

---

## X (Twitter) API v2

### Setup
1. Create developer account → developer.x.com
2. Create project + app
3. Choose access level: Free ($0), Basic ($200/mo), Pro ($5000/mo)
4. Generate API Key + API Secret + Bearer Token
5. For user actions: OAuth 2.0 with PKCE

### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /2/tweets` | POST | Create tweet |
| `GET /2/users/me` | GET | Get authenticated user |
| `GET /2/users/:id/tweets` | GET | List user's tweets |
| `GET /2/users/:id/followers` | GET | List followers |
| `POST /2/users/:id/follow` | POST | Follow user |
| `GET /2/tweets/search/recent` | GET | Search tweets |

### Pricing (Pay-per-use)
- Free tier: 1 app, 1,500 tweets/mo read, 50 tweets/mo write
- Basic: $200/mo, 50,000 tweets/mo read, 3,000 tweets/mo write
- Pro: $5,000/mo, 1,000,000 tweets/mo read, 300,000 tweets/mo write
- Owned Reads: $0.001/resource (your own data)

### OAuth 2.0 with PKCE
```
1. Generate code_verifier + code_challenge
2. Redirect user to:
   https://twitter.com/i/oauth2/authorize
     ?client_id={client_id}
     &redirect_uri={redirect_uri}
     &response_type=code
     &code_challenge={challenge}
     &code_challenge_method=S256
     &scope=tweet.read+tweet.write+users.read+offline.access
3. User authorizes → get auth code
4. Exchange code + code_verifier for tokens
5. Store refresh_token
```

### Client Libraries
- Python: `pip install tweepy`
- Official: https://github.com/twitterdev/Twitter-API-v2-sample-code
