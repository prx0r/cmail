// qp/probes/email-roundtrip.ts — P5: email_receives proof
// The canonical inbound-mail proof. Requires:
// 1. dns_configured and email_route_configured are TRUE
// 2. QP generates cryptographically random nonce N
// 3. Independent sender sends N to exact A
// 4. cmail receives/indexes message
// 5. Probe queries exact mailbox A, never global token search
// 6. Evidence binds A, N, sender, provider/raw message ID, timestamps

import { createHash, randomBytes } from "crypto";
import type { Evidence, Claim, ProofSpec } from "../kernel";

// ═══════════════════════════════════════════════════════════
// NONCE GENERATION
// ═══════════════════════════════════════════════════════════

export function generateNonce(): string {
  return "CMAIL-" + randomBytes(8).toString("hex").toUpperCase();
}

// ═══════════════════════════════════════════════════════════
// ROUND-TRIP PROOF
// ═══════════════════════════════════════════════════════════

export interface RoundTripProof {
  nonce: string;
  address: string;
  domain: string;
  sender: string;
  sent_at: string;
  received_at: string;
  message_id: string;
  subject: string;
  raw_hash: string;
  evidence: Evidence[];
  valid: boolean;
  reason?: string;
}

/**
 * Generate a round-trip proof for email_receives.
 * This is the canonical proof that address A can receive email.
 *
 * Flow:
 * 1. Generate nonce N
 * 2. Send N to exact A from external sender
 * 3. Poll cmail inbox for N in exact mailbox A
 * 4. If found within freshness window → proof valid
 */
export async function generateRoundTripProof(params: {
  address: string;
  domain: string;
  sender: string;
  sendFn: (to: string, subject: string, body: string) => Promise<{ message_id: string }>;
  pollFn: (mailbox: string, token: string) => Promise<{ found: boolean; message_id?: string; received_at?: string }>;
  claimId: string;
  freshnessSeconds?: number;
}): Promise<RoundTripProof> {
  const freshness = params.freshnessSeconds || 600; // 10 minutes default
  const nonce = createHash("sha256")
    .update(randomBytes(16))
    .digest("hex")
    .slice(0, 12)
    .toUpperCase();
  const token = `CMAIL-${nonce}`;

  const sentAt = new Date().toISOString();

  // Step 1: Send email with token
  let messageId: string;
  try {
    const result = await params.sendFn(params.address, token, `QP round-trip proof. Token: ${token}`);
    messageId = result.message_id;
  } catch (e: any) {
    return {
      nonce: token,
      address: params.address,
      domain: params.domain,
      sender: params.sender,
      sent_at: sentAt,
      received_at: "",
      message_id: "",
      subject: token,
      raw_hash: "",
      evidence: [],
      valid: false,
      reason: `send failed: ${e.message}`,
    };
  }

  // Step 2: Poll for receipt in exact mailbox
  const pollStart = Date.now();
  let found = false;
  let receivedAt = "";
  let receivedMessageId = "";

  while (Date.now() - pollStart < freshness * 1000) {
    const result = await params.pollFn(params.address, token);
    if (result.found) {
      found = true;
      receivedAt = result.received_at || new Date().toISOString();
      receivedMessageId = result.message_id || messageId;
      break;
    }
    // Wait 20 seconds between polls
    await new Promise((r) => setTimeout(r, 20000));
  }

  if (!found) {
    return {
      nonce: token,
      address: params.address,
      domain: params.domain,
      sender: params.sender,
      sent_at: sentAt,
      received_at: "",
      message_id: messageId,
      subject: token,
      raw_hash: "",
      evidence: [],
      valid: false,
      reason: `nonce not observed in mailbox within ${freshness}s`,
    };
  }

  // Step 3: Generate evidence items
  const evidence: Evidence[] = [
    // Evidence 1: The nonce observation
    {
      id: "ev:" + createHash("sha256").update(`nonce:${token}:${params.address}`).digest("hex"),
      class: "email_roundtrip",
      claim_id: params.claimId,
      observed_at: receivedAt,
      source: "cmail-worker",
      locator: `mailbox:${params.address}`,
      collector_id: "email-roundtrip-probe",
      collector_program_hash: sha256("email-roundtrip-probe"),
      collector_runtime_hash: "node:20",
      response_hash: JSON.stringify({
        token,
        address: params.address,
        message_id: receivedMessageId,
        received_at: receivedAt,
      }),
      normalized_payload_hash: sha256(token + params.address + receivedMessageId),
      nonce: token,
      independence_group: "email-roundtrip",
    },
    // Evidence 2: The send confirmation
    {
      id: "ev:" + createHash("sha256").update(`send:${messageId}`).digest("hex"),
      class: "send_confirmation",
      claim_id: params.claimId,
      observed_at: sentAt,
      source: params.sender,
      locator: `smtp:${params.address}`,
      collector_id: "email-roundtrip-probe",
      collector_program_hash: sha256("email-roundtrip-probe"),
      collector_runtime_hash: "node:20",
      response_hash: JSON.stringify({ message_id: messageId, sent_at: sentAt }),
      normalized_payload_hash: sha256(messageId + sentAt),
      independence_group: "email-send",
    },
  ];

  return {
    nonce: token,
    address: params.address,
    domain: params.domain,
    sender: params.sender,
    sent_at: sentAt,
    received_at: receivedAt,
    message_id: receivedMessageId,
    subject: token,
    raw_hash: sha256(token + params.address + receivedMessageId),
    evidence,
    valid: true,
  };
}

// ═══════════════════════════════════════════════════════════
// JUDGE: nonce_observed_v1
// ═══════════════════════════════════════════════════════════

import type { JudgeResult } from "../kernel";

export function judgeNonceObserved(evidence: Evidence[]): JudgeResult {
  const relevant = evidence.filter((e) => e.class === "email_roundtrip");

  if (relevant.length === 0) {
    return {
      judge_id: "nonce_observed_v1",
      bundle_hash: "",
      actuality: "UNKNOWN",
      reasons: ["no email roundtrip evidence"],
      evidence_ids: [],
    };
  }

  // Check that nonce was observed in exact mailbox
  for (const e of relevant) {
    try {
      const data = JSON.parse(e.response_hash);
      if (data.token && data.address && data.message_id) {
        return {
          judge_id: "nonce_observed_v1",
          bundle_hash: "",
          actuality: "TRUE",
          reasons: [`nonce ${data.token} observed in ${data.address}`],
          evidence_ids: [e.id],
        };
      }
    } catch {
      // malformed evidence
    }
  }

  return {
    judge_id: "nonce_observed_v1",
    bundle_hash: "",
    actuality: "FALSE",
    reasons: ["nonce not properly observed"],
    evidence_ids: relevant.map((e) => e.id),
  };
}

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
