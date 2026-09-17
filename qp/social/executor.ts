// qp/social/executor.ts — Social Executor Interface
// Postiz (or any adapter) implements this. QP wraps it.
// The executor does the work. QP proves the result.

import type { Evidence, Actuality, TransitionReceipt } from "../kernel";
import { computeReceiptHash, merkleRoot, sha256, canonical } from "../kernel";

// ═══════════════════════════════════════════════════════════
// EXECUTOR — the contract every social adapter implements
// ═══════════════════════════════════════════════════════════

export interface SocialExecutor {
  readonly platform: string;      // "youtube", "instagram", "tiktok", "x"
  readonly name: string;          // "YouTube Data API v3"

  // Execute a desired state change
  execute(params: ExecuteParams): Promise<ExecuteResult>;

  // Read back current state (independent verification)
  readback(params: ReadbackParams): Promise<ReadbackResult>;

  // Get analytics snapshot
  analytics(params: AnalyticsParams): Promise<AnalyticsResult>;
}

export interface ExecuteParams {
  action: string;                 // "video.publish", "post.create", "account.create"
  artifact_hash?: string;         // SHA-256 of content being posted
  target: Record<string, string>; // { channel: "UCabc", handle: "@user" }
  payload: Record<string, any>;   // platform-specific payload
  authority_proof: string;        // QP receipt ID authorizing this action
}

export interface ExecuteResult {
  success: boolean;
  platform_id?: string;           // video_id, post_id, etc.
  release_url?: string;
  error?: string;
  // CRITICAL: this is NOT the proof. It's just evidence.
  // QP must independently verify via readback.
  raw_response: string;
}

export interface ReadbackParams {
  platform_id: string;            // video_id, post_id, etc.
  claim_type: string;             // "video_created", "post_published", etc.
  expected_state: Record<string, any>; // what we expect to find
}

export interface ReadbackResult {
  exists: boolean;
  state: Record<string, any>;     // actual state from platform
  evidence: Evidence[];           // provenance-bearing evidence
  actuality: Actuality;           // TRUE if state matches expected
}

export interface AnalyticsParams {
  channel_id: string;
  metrics: string[];              // ["views", "likes", "subscribers"]
  dimensions: string[];           // ["day", "video"]
  date_range: { start: string; end: string };
}

export interface AnalyticsResult {
  data: Array<{ metric: string; dimension: string; value: string; date: string }>;
  evidence: Evidence[];
}

// ═══════════════════════════════════════════════════════════
// POSTIZ ADAPTER — wraps Postiz as a SocialExecutor
// ═══════════════════════════════════════════════════════════

export class PostizAdapter implements SocialExecutor {
  readonly platform: string;
  readonly name: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(platform: string, baseUrl: string, apiKey: string) {
    this.platform = platform;
    this.name = `Postiz (${platform})`;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async execute(params: ExecuteParams): Promise<ExecuteResult> {
    // Call Postiz API to execute the action
    // This is the "ugly work" — scheduling, media upload, platform normalization
    try {
      const response = await fetch(`${this.baseUrl}/api/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          integration_id: params.target.integration_id,
          content: params.payload.content,
          media: params.payload.media,
          settings: params.payload.settings,
          schedule: params.payload.schedule,
        }),
      });

      const data = await response.json() as any;
      return {
        success: response.ok,
        platform_id: data.id || data.release_id,
        release_url: data.url,
        raw_response: JSON.stringify(data),
      };
    } catch (e: any) {
      return {
        success: false,
        error: e.message,
        raw_response: JSON.stringify({ error: e.message }),
      };
    }
  }

  async readback(params: ReadbackParams): Promise<ReadbackResult> {
    // CRITICAL: This is NOT calling Postiz.
    // This calls the PLATFORM DIRECTLY (YouTube API, Instagram Graph API, etc.)
    // to independently verify the state.
    //
    // For YouTube: GET /youtube/v3/videos?id={video_id}&part=status,snippet
    // For Instagram: GET /{media-id}?fields=status,permalink
    // For TikTok: POST /v2/post/publish/status/fetch/
    // For X: GET /2/tweets/{tweet_id}

    // This is a placeholder — actual implementation calls platform APIs
    return {
      exists: false,
      state: {},
      evidence: [],
      actuality: "UNKNOWN",
    };
  }

  async analytics(params: AnalyticsParams): Promise<AnalyticsResult> {
    // Call platform analytics API directly (not Postiz)
    // YouTube: youtubeanalytics.googleapis.com/v2/reports
    // Instagram: GET /{ig-user-id}/insights
    return { data: [], evidence: [] };
  }
}

// ═══════════════════════════════════════════════════════════
// CAPABILITY — what agents receive instead of credentials
// ═══════════════════════════════════════════════════════════

export interface SocialCapability {
  id: string;                    // "social.youtube.channel[UC123].post_video"
  platform: string;
  account_id: string;            // channel ID, user ID, etc.
  action: string;                // "post_video", "read_analytics", etc.
  granted_by: string;            // QP receipt ID
  constraints: Record<string, any>;
  expires_at?: string;
}

// ═══════════════════════════════════════════════════════════
// SOCIAL GATEWAY — the final primitive
// ═══════════════════════════════════════════════════════════

/**
 * agent.social.execute(desired_state, authority) -> QP receipt
 *
 * This is the single entry point for all social actions.
 * The agent doesn't know or care which executor is used.
 * QP handles authority, execution, readback, and settlement.
 */
export async function socialExecute(
  executor: SocialExecutor,
  desired: {
    action: string;
    target: Record<string, string>;
    payload: Record<string, any>;
    artifact_hash?: string;
  },
  authority: {
    grant_id: string;
    grant_proof: string;
  }
): Promise<{
  receipt: TransitionReceipt | null;
  actuality: Actuality;
  evidence: Evidence[];
}> {
  // 2. Execute via adapter
  const execResult = await executor.execute({
    action: desired.action,
    artifact_hash: desired.artifact_hash,
    target: desired.target,
    payload: desired.payload,
    authority_proof: authority.grant_proof,
  });

  if (!execResult.success || !execResult.platform_id) {
    return {
      receipt: null,
      actuality: "FALSE",
      evidence: [{
        id: "ev:" + Date.now(),
        class: "execution_failure",
        claim_id: "",
        observed_at: new Date().toISOString(),
        source: executor.name,
        locator: `${executor.platform}:${desired.action}`,
        collector_id: "social-gateway",
        collector_program_hash: sha256("social-gateway"),
        collector_runtime_hash: "node:20",
        response_payload: execResult.raw_response,
        response_hash: sha256(execResult.raw_response),
        normalized_payload_hash: sha256(execResult.raw_response),
        independence_group: "execution",
      }],
    };
  }

  // 3. Independent readback
  const readback = await executor.readback({
    platform_id: execResult.platform_id,
    claim_type: `${desired.action}_created`,
    expected_state: desired.payload,
  });

  if (!readback.exists) {
    return { receipt: null, actuality: "UNKNOWN", evidence: readback.evidence };
  }

  // 4. Compute actual QP receipt
  const allEvidence = readback.evidence;
  const receipt: TransitionReceipt = {
    protocol: "qp/1",
    transition_type: "EFFECT",
    contract_root: "",
    claim_id: `${desired.action}:${execResult.platform_id}`,
    state_before_root: sha256("state:before"),
    proposal_root: sha256(JSON.stringify(desired)),
    evidence_root: merkleRoot(allEvidence.map((e) => e.id)),
    judge_results_root: merkleRoot([`${desired.action}:${readback.actuality}`]),
    gate_results_root: merkleRoot([`readback:${readback.exists ? "pass" : "fail"}`]),
    actuality: readback.actuality,
    authority_id: authority.grant_id,
    transition_program_hash: sha256("social-execute"),
    state_after_root: sha256(JSON.stringify(readback.state)),
    run: {
      executor_id: executor.name,
      program_hash: sha256(executor.name),
      runtime_hash: "node:20",
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    },
    prev_receipt_hash: sha256("prev"),
    settled_at: new Date().toISOString(),
    receipt_hash: "",
    qp_signer: "social-gateway",
    qp_signature: "",
  };
  receipt.receipt_hash = computeReceiptHash(receipt);

  return {
    receipt,
    actuality: readback.actuality,
    evidence: allEvidence,
  };
}
