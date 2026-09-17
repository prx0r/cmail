# Postiz Migration Plan — Stealing Provider Primitives

## The Goal

Port Postiz's 35+ social providers into our MCP capacity system. Each provider becomes a capacity MCP that implements our `CapacityMCP` interface. The provider handles OAuth + posting + analytics. Our MCP handles dependency chain + QP proofs + human queue.

## Architecture Bridge

```
BEFORE (Postiz):
  Frontend → IntegrationManager → Provider.post() → Platform API

AFTER (setup.social):
  Agent → Orchestrator → CapacityMCP.executeStep() → Provider.post() → Platform API
                                    ↓
                              QP Proof generated
                                    ↓
                              Grants emitted
                                    ↓
                              Downstream capacities unlock
```

## Step 1: Port the Provider Interface

Postiz has `IAuthenticator` + `ISocialMediaIntegration`. We merge both into our `CapacityMCP`:

```typescript
// mcp/interface.ts — add these to CapacityMCP

// From Postiz IAuthenticator:
generateAuthUrl(): Promise<{ url: string; state: string; codeVerifier: string }>;
authenticate(code: string, codeVerifier: string): Promise<TokenResult>;
refreshToken(refreshToken: string): Promise<TokenResult>;

// From Postiz ISocialMediaIntegration:
post(accessToken: string, content: PostContent[]): Promise<PostResult>;
checkPostStatus(accessToken: string, pendingData: any): Promise<PostStatus>;
finalizePost(accessToken: string, pendingData: any): Promise<FinalResult>;

// Our additions:
generateProof(): QPReceipt;
grants(): Grant[];
```

## Step 2: Port the Abstract Base

Postiz has `SocialAbstract` with SSRF-safe fetch + error classification. We port this as our base MCP:

```typescript
// mcp/base.ts — port from postiz social.abstract.ts

export abstract class BaseCapacityMCP implements CapacityMCP {
  // From Postiz SocialAbstract:
  protected async safeFetch(url: string, options: RequestInit): Promise<Response> {
    // SSRF protection
    // Auto-retry on 429/500
    // Token refresh detection
    // Error classification → RefreshToken | Disconnect | BadBody
  }

  protected handleErrors(body: string, status: number): { type: string; value: string } | null {
    // Override per provider
    // Classify platform-specific errors
  }

  // Media utilities from Postiz:
  protected async mediaSize(path: string): Promise<number> { ... }
  protected async mediaChunk(path: string, start: number, end: number): Promise<Buffer> { ... }
  protected async mediaStream(path: string): Promise<ReadableStream> { ... }
}
```

## Step 3: Port Each Provider

For each of the Big 4 + extras, port from Postiz provider → our capacity MCP:

### YouTube

```typescript
// mcp/youtube.ts
// Source: postiz/libraries/nestjs-libraries/src/integrations/social/youtube.provider.ts

export class YouTubeMCP extends BaseCapacityMCP {
  readonly id = "cap:youtube";
  readonly name = "YouTube";
  readonly category = "social";

  dependsOn(): string[] { return ["cap:email", "cap:phone"]; }

  // From Postiz YoutubeProvider:
  // - OAuth 2.0 via googleapis
  // - Resumable upload with 8MB chunks
  // - Channel creation flow
  // - Analytics via YouTube Analytics API

  async generateAuthUrl() {
    // Port from Postiz: google OAuth2 consent screen
    // Scopes: youtube, youtube.upload, youtube.readonly, yt-analytics.readonly
  }

  async authenticate(code: string, codeVerifier: string) {
    // Port from Postiz: exchange code for tokens
    // Return: { accessToken, refreshToken, expiresIn, id, name, username }
  }

  async post(accessToken: string, content: PostContent[]) {
    // Port from Postiz YoutubeProvider.post()
    // 1. Resumable upload session
    // 2. Upload video in 8MB chunks
    // 3. Set metadata (title, description, tags)
    // 4. Return publish status
  }

  async postPending(accessToken: string, content: PostContent[]) {
    // Port from Postiz: non-blocking upload
    // Returns { status: 'pending', pendingData: { uploadUrl, videoId } }
  }

  async checkPostStatus(accessToken: string, pendingData: any) {
    // Port from Postiz: poll video processing status
  }

  async finalizePost(accessToken: string, pendingData: any) {
    // Port from Postiz: publish video (make public)
  }

  // Our additions:
  generateProof(): QPReceipt { ... }
  grants(): Grant[] {
    return [
      { capability: "have_handle:youtube", proof_level: 7 },
      { capability: "can_post:youtube", proof_level: 7 },
      { capability: "can_analytics:youtube", proof_level: 4 },
    ];
  }
}
```

### Instagram

```typescript
// mcp/instagram.ts
// Source: postiz/libraries/nestjs-libraries/src/integrations/social/instagram.provider.ts

export class InstagramMCP extends BaseCapacityMCP {
  readonly id = "cap:instagram";
  readonly name = "Instagram";
  readonly category = "social";

  dependsOn(): string[] { return ["cap:email", "cap:phone"]; }

  // From Postiz InstagramProvider:
  // - Facebook OAuth 2.0 (Meta Graph API)
  // - Two-step: user token → page token
  // - Container creation + media_publish
  // - Between-steps: page selection

  async generateAuthUrl() {
    // Port from Postiz: Facebook OAuth with instagram_basic scope
  }

  async authenticate(code: string, codeVerifier: string) {
    // Port from Postiz: exchange code, get pages, return page token
    // isBetweenSteps = true (need page selection)
  }

  async fetchPageInformation(accessToken: string, pageId: string) {
    // Port from Postiz: get Instagram Business Account from Facebook Page
  }

  async post(accessToken: string, content: PostContent[]) {
    // Port from Postiz: create container → wait → media_publish
    // POST /{ig-user-id}/media → POST /{ig-user-id}/media_publish
  }

  // Meta bundle: Instagram unlocks Facebook + WhatsApp
  grants(): Grant[] {
    return [
      { capability: "have_handle:instagram", proof_level: 7 },
      { capability: "have_meta_business", proof_level: 7 },
      { capability: "have_handle:facebook", proof_level: 7 },
      { capability: "have_handle:whatsapp", proof_level: 7 },
      { capability: "can_post:instagram", proof_level: 7 },
    ];
  }
}
```

### TikTok

```typescript
// mcp/tiktok.ts
// Source: postiz/libraries/nestjs-libraries/src/integrations/social/tiktok.provider.ts

export class TikTokMCP extends BaseCapacityMCP {
  readonly id = "cap:tiktok";
  readonly name = "TikTok";
  readonly category = "social";

  dependsOn(): string[] { return ["cap:email", "cap:phone"]; }

  // From Postiz TiktokProvider:
  // - OAuth 2.0
  // - File upload with 10MB chunks
  // - PUBLISH_COMPLETE polling
  // - Unaudited apps: private-only content

  async post(accessToken: string, content: PostContent[]) {
    // Port from Postiz: init upload → chunked PUT → poll status
    // POST /v2/post/publish/video/init/ → PUT upload_url → poll
  }

  // TikTok audit: content is private until app passes audit
  grants(): Grant[] {
    return [
      { capability: "have_handle:tiktok", proof_level: 7 },
      { capability: "can_post:tiktok", proof_level: 7 },
      // Note: private posting only until audit passed
    ];
  }
}
```

### X (Twitter)

```typescript
// mcp/x.ts
// Source: postiz/libraries/nestjs-libraries/src/integrations/social/x.provider.ts

export class XMCP extends BaseCapacityMCP {
  readonly id = "cap:x";
  readonly name = "X (Twitter)";
  readonly category = "social";

  dependsOn(): string[] { return ["cap:email", "cap:phone"]; }

  // From Postiz XProvider:
  // - OAuth 1.0a (twitter-api-v2 library)
  // - Media upload with 1MB chunks
  // - Tweet creation with media_ids
  // - Free tier: 50 tweets/mo write

  async authenticate(code: string, codeVerifier: string) {
    // Port from Postiz: OAuth 1.0a token exchange
    // Return: { accessToken, accessSecret, ... }
  }

  async post(accessToken: string, content: PostContent[]) {
    // Port from Postiz: upload media → create tweet
    // 1. Upload media chunks (1MB each)
    // 2. POST /2/tweets with media_ids
  }

  grants(): Grant[] {
    return [
      { capability: "have_handle:x", proof_level: 7 },
      { capability: "can_post:x", proof_level: 7 },
    ];
  }
}
```

## Step 4: Port Token Refresh

Postiz has two refresh patterns. We port both:

```typescript
// mcp/refresh.ts — port from postiz refresh.token.workflow.ts + refresh.integration.service.ts

// Pattern 1: Proactive (cron-like)
// Each MCP tracks tokenExpiration. Agent checks before each API call.

// Pattern 2: Reactive (on failure)
// If API returns 401 → call refreshToken() → update token → retry

export async function handleTokenRefresh(
  mcp: CapacityMCP,
  error: any,
  currentToken: string
): Promise<string | null> {
  if (error.status === 401 || error.message?.includes("token")) {
    const newTokens = await mcp.refreshToken(currentToken);
    if (newTokens) return newTokens.accessToken;
    return null; // needs re-auth
  }
  return null;
}
```

## Step 5: Port Media Upload

Postiz has chunked upload patterns for each platform. We port them as utility functions:

```typescript
// mcp/media.ts — port from postiz providers

export interface UploadConfig {
  maxChunkSize: number;  // YouTube: 8MB, TikTok: 10MB, X: 1MB
  method: "resumable" | "chunked" | "direct";
  contentType: string;
}

export const UPLOAD_CONFIGS: Record<string, UploadConfig> = {
  youtube: { maxChunkSize: 8 * 1024 * 1024, method: "resumable", contentType: "video/*" },
  tiktok:  { maxChunkSize: 10 * 1024 * 1024, method: "chunked", contentType: "video/mp4" },
  x:       { maxChunkSize: 1 * 1024 * 1024, method: "chunked", contentType: "media/*" },
  instagram: { maxChunkSize: 0, method: "direct", contentType: "image/*" }, // URL-based
};

export async function uploadMedia(
  platform: string,
  accessToken: string,
  mediaPath: string
): Promise<{ mediaId: string; status: string }> {
  const config = UPLOAD_CONFIGS[platform];
  // Route to platform-specific upload logic
  // All share the same interface: upload → return mediaId
}
```

## Step 6: Port Analytics

Postiz has a uniform analytics interface. We port it:

```typescript
// mcp/analytics.ts — port from postiz social.integrations.interface.ts

export interface AnalyticsData {
  label: string;
  data: Array<{ total: string; date: string }>;
  percentageChange: number;
}

// Each social MCP implements analytics():
// YouTube: YouTube Analytics API
// Instagram: Instagram Graph API insights
// TikTok: TikTok Analytics API
// X: X API v2 metrics

export async function getAnalytics(
  mcp: CapacityMCP,
  accessToken: string,
  dateRange: { start: string; end: string }
): Promise<AnalyticsData[]> {
  // Each MCP returns the same format
  // Postiz caches in Redis with 1-hour TTL — we can do the same
}
```

## Step 7: Wire Into Orchestrator

The orchestrator now chains Postiz-powered MCPs:

```typescript
// mcp/demo-full.ts

const orch = new Orchestrator();

// Infrastructure
orch.register(new DomainMCP("privately.win", cfToken));
orch.register(new EmailMCP("privately.win"));
orch.register(new PhoneMCP(telnyxKey));

// Socials (Postiz-powered)
orch.register(new YouTubeMCP(googleCredentials));
orch.register(new InstagramMCP(metaCredentials));
orch.register(new TikTokMCP(tiktokCredentials));
orch.register(new XMCP(xCredentials));
orch.register(new BlueskyMCP());

// Agent evaluates the chain
const eval_ = orch.evaluate();

// Human tasks fall out
for (const ht of eval_.ready_human) {
  console.log(`👤 ${ht.summary}: "${ht.approval_format}"`);
}

// Agent tasks auto-execute
for (const at of eval_.ready_agent) {
  await orch.executeAgentTask(at.mcpId, at.stepId);
}
```

## File Map: Postiz → setup.social

| Postiz File | Our File | What |
|-------------|----------|------|
| `social.integrations.interface.ts` | `mcp/interface.ts` | Provider contract |
| `social.abstract.ts` | `mcp/base.ts` | Base class with safe fetch + error handling |
| `integration.manager.ts` | `mcp/orchestrator.ts` | Provider registry + chain resolution |
| `youtube.provider.ts` | `mcp/youtube.ts` | YouTube MCP |
| `instagram.provider.ts` | `mcp/instagram.ts` | Instagram MCP |
| `tiktok.provider.ts` | `mcp/tiktok.ts` | TikTok MCP |
| `x.provider.ts` | `mcp/x.ts` | X MCP |
| `facebook.provider.ts` | `mcp/facebook.ts` | Facebook MCP |
| `bluesky.provider.ts` | `mcp/bluesky.ts` | Bluesky MCP |
| `refresh.token.workflow.ts` | `mcp/refresh.ts` | Token refresh |
| `post.workflow.v1.1.2.ts` | `mcp/posting.ts` | Pending/async post pattern |
| `schema.prisma` Integration model | D1 `capacities` table | Channel storage |

## What We DON'T Steal

| Postiz Feature | Why Not |
|----------------|---------|
| Temporal workflows | Overkill — our chain is simpler |
| PostgreSQL + Prisma | We use D1 (Cloudflare) |
| Redis | We use KV or D1 |
| Frontend React app | Agent IS the frontend |
| NestJS backend | We're a Cloudflare Worker |
| 35 providers | We start with 4-5, add as needed |

## What We ADD (Not in Postiz)

| Feature | Why |
|---------|-----|
| QP proofs | Postiz doesn't verify — we do |
| Dependency chain | Postiz has flat integrations — we have a DAG |
| Human queue | Postiz assumes human is always present — we queue |
| Autonomy classification | Postiz doesn't distinguish agent vs human tasks |
| Capacity grants | Postiz doesn't chain — we unlock downstream |
| Cost calculator | Postiz doesn't track costs — we do |

## Implementation Order

1. `mcp/base.ts` — Port SocialAbstract (safe fetch + error handling)
2. `mcp/youtube.ts` — Port YoutubeProvider (OAuth + upload + analytics)
3. `mcp/instagram.ts` — Port InstagramProvider (Meta OAuth + container publish)
4. `mcp/tiktok.ts` — Port TiktokProvider (chunked upload + polling)
5. `mcp/x.ts` — Port XProvider (OAuth 1.0a + media upload)
6. `mcp/refresh.ts` — Port token refresh (proactive + reactive)
7. `mcp/media.ts` — Port media upload utilities
8. `mcp/analytics.ts` — Port analytics interface
9. Wire into orchestrator + demo
10. Tests

## Testing

Each provider can be tested with the FakeCloudflareRegistrar pattern:
- Mock OAuth flow (generate auth URL → fake code → fake tokens)
- Mock API calls (fake upload → fake status → fake publish)
- Verify QP proofs are generated correctly
- Verify grants unlock downstream capacities

No real API calls needed for unit tests.
