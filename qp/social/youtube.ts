// qp/social/youtube.ts — YouTube adapter using Postiz provider patterns
// Reuses Postiz's OAuth + upload logic. QP handles proof/authority.

import { createHash } from "crypto";
import type { Evidence, Actuality } from "../kernel";
import { judgeOAuthAuthorized } from "../judges";

// ═══════════════════════════════════════════════════════════
// YOUTUBE ADAPTER — wraps googleapis (same as Postiz)
// ═══════════════════════════════════════════════════════════

export interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface YouTubeTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  customUrl: string;
  subscriberCount: string;
  thumbnail: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  privacyStatus: string;
  uploadStatus: string;
  processingStatus: string;
  channelId: string;
  publishedAt: string;
}

// ─── OAuth (ported from Postiz YoutubeProvider) ──────────

export function generateAuthUrl(config: YouTubeConfig): string {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
  ];

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCode(
  config: YouTubeConfig,
  code: string
): Promise<YouTubeTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

export async function refreshToken(
  config: YouTubeConfig,
  refreshToken: string
): Promise<YouTubeTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    ...data,
    refresh_token: refreshToken, // Google doesn't return new refresh token
  };
}

// ─── Channel Info (ported from Postiz pages() + fetchPageInformation()) ──

export async function getChannels(accessToken: string): Promise<YouTubeChannel[]> {
  const response = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) throw new Error(`Failed to fetch channels: ${response.statusText}`);
  const data = await response.json();
  return (data.items || []).map((ch: any) => ({
    id: ch.id,
    title: ch.snippet?.title || "Unnamed",
    customUrl: ch.snippet?.customUrl || "",
    subscriberCount: ch.statistics?.subscriberCount || "0",
    thumbnail: ch.snippet?.thumbnails?.default?.url || "",
  }));
}

// ─── Readback (INDEPENDENT verification via YouTube API) ──
// This is NOT Postiz. This calls Google directly.

export async function readbackVideo(
  accessToken: string,
  videoId: string
): Promise<YouTubeVideo | null> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,status,contentDetails,processingDetails`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return null;
  const data = await response.json();
  const video = data.items?.[0];
  if (!video) return null;

  return {
    id: video.id,
    title: video.snippet?.title || "",
    description: video.snippet?.description || "",
    privacyStatus: video.status?.privacyStatus || "",
    uploadStatus: video.status?.uploadStatus || "",
    processingStatus: video.processingDetails?.processingStatus || "",
    channelId: video.snippet?.channelId || "",
    publishedAt: video.snippet?.publishedAt || "",
  };
}

export async function readbackChannel(
  accessToken: string,
  channelId: string
): Promise<{ exists: boolean; subscriberCount?: string; videoCount?: string }> {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=statistics`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return { exists: false };
  const data = await response.json();
  const ch = data.items?.[0];
  if (!ch) return { exists: false };

  return {
    exists: true,
    subscriberCount: ch.statistics?.subscriberCount,
    videoCount: ch.statistics?.videoCount,
  };
}

// ─── Analytics (INDEPENDENT via YouTube Analytics API) ──

export async function getAnalytics(
  accessToken: string,
  channelId: string,
  metrics: string[],
  dimensions: string[],
  startDate: string,
  endDate: string
): Promise<Array<{ metric: string; dimension: string; value: string; date: string }>> {
  const params = new URLSearchParams({
    ids: `channel==${channelId}`,
    startDate,
    endDate,
    metrics: metrics.join(","),
    dimensions: dimensions.join(","),
  });

  const response = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) return [];
  const data = await response.json();
  const rows = data.rows || [];
  const cols = data.columnHeaders || [];

  return rows.map((row: any[]) => {
    const result: Record<string, string> = {};
    cols.forEach((col: any, i: number) => {
      result[col.name] = String(row[i]);
    });
    return {
      metric: metrics.join(","),
      dimension: dimensions.join(","),
      value: JSON.stringify(result),
      date: result.date || result.day || startDate,
    };
  });
}

// ─── QP Evidence Generators ──────────────────────────────

export function generateOAuthEvidence(
  channelId: string,
  scopes: string[],
  tokenResponse: YouTubeTokens
): Evidence {
  const responseHash = createHash("sha256")
    .update(JSON.stringify({ channel_id: channelId, scopes, token_type: tokenResponse.token_type }))
    .digest("hex");

  return {
    id: "ev:" + createHash("sha256").update(`youtube:oauth:${channelId}`).digest("hex"),
    class: "oauth_response",
    claim_id: `claim:oauth_authorized:youtube:${channelId}`,
    observed_at: new Date().toISOString(),
    source: "google-oauth2",
    locator: `google:oauth2:token`,
    collector_id: "youtube-adapter",
    collector_program_hash: createHash("sha256").update("youtube-adapter").digest("hex"),
    collector_runtime_hash: "node:20",
    response_hash: responseHash,
    normalized_payload_hash: createHash("sha256").update(JSON.stringify(tokenResponse)).digest("hex"),
    independence_group: "youtube-oauth",
  };
}

export function generateVideoReadbackEvidence(
  video: YouTubeVideo
): Evidence {
  return {
    id: "ev:" + createHash("sha256").update(`youtube:video:${video.id}`).digest("hex"),
    class: "api_response",
    claim_id: `claim:youtube_video_created:${video.channelId}:${video.id}`,
    observed_at: new Date().toISOString(),
    source: "youtube-data-api",
    locator: `youtube:videos:${video.id}`,
    collector_id: "youtube-adapter",
    collector_program_hash: createHash("sha256").update("youtube-adapter").digest("hex"),
    collector_runtime_hash: "node:20",
    response_hash: createHash("sha256").update(JSON.stringify(video)).digest("hex"),
    normalized_payload_hash: createHash("sha256").update(JSON.stringify(video)).digest("hex"),
    independence_group: "youtube-readback",
  };
}

export function generateChannelReadbackEvidence(
  channelId: string,
  channelData: { exists: boolean; subscriberCount?: string; videoCount?: string }
): Evidence {
  return {
    id: "ev:" + createHash("sha256").update(`youtube:channel:${channelId}`).digest("hex"),
    class: "api_response",
    claim_id: `claim:account_owned:youtube:${channelId}`,
    observed_at: new Date().toISOString(),
    source: "youtube-data-api",
    locator: `youtube:channels:${channelId}`,
    collector_id: "youtube-adapter",
    collector_program_hash: createHash("sha256").update("youtube-adapter").digest("hex"),
    collector_runtime_hash: "node:20",
    response_hash: createHash("sha256").update(JSON.stringify(channelData)).digest("hex"),
    normalized_payload_hash: createHash("sha256").update(JSON.stringify(channelData)).digest("hex"),
    independence_group: "youtube-readback",
  };
}
