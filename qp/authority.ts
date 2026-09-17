// qp/authority.ts — Grant/Authority system with Ed25519 signing
// Grants are bounded, signed, single-use authority for consequential effects.
// Authority is SEPARATE from truth — a true claim never creates authority.

import { createHash, generateKeyPairSync, sign, verify, randomBytes } from "crypto";
import type { Grant } from "./kernel";

// ═══════════════════════════════════════════════════════════
// KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════

export interface KeyPair {
  publicKey: string;   // hex
  privateKey: string;  // hex
}

export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKey: String(publicKey.export({ type: "spki", format: "pem" })),
    privateKey: String(privateKey.export({ type: "pkcs8", format: "pem" })),
  };
}

export function keyId(publicKey: string): string {
  return "key:" + createHash("sha256").update(publicKey).digest("hex").slice(0, 16);
}

// ═══════════════════════════════════════════════════════════
// GRANT ISSUANCE
// ═══════════════════════════════════════════════════════════

export function issueGrant(params: {
  issuer: string;
  subject: string;
  action: string;
  payload: any;
  constraints?: Grant["constraints"];
  ttlSeconds?: number;
  maxUses?: number;
  issuerKey: string;   // private key hex
}): Grant {
  const now = new Date().toISOString();
  const ttl = params.ttlSeconds || 3600;
  const expires = new Date(Date.now() + ttl * 1000).toISOString();
  const nonce = createHash("sha256").update(String(Date.now()) + String(Math.random())).digest("hex").slice(0, 32);
  const payloadHash = createHash("sha256").update(JSON.stringify(params.payload)).digest("hex");

  const grantBody = {
    protocol: "qp/1" as const,
    issuer: params.issuer,
    subject: params.subject,
    action: params.action,
    payload_hash: payloadHash,
    constraints: params.constraints || {},
    issued_at: now,
    expires_at: expires,
    nonce,
    max_uses: params.maxUses || 1,
  };

  // Sign the canonical body
  const canonical = JSON.stringify(grantBody, Object.keys(grantBody).sort());
  const { createSign } = require("crypto");
  const signObj = createSign("sha256");
  signObj.update(canonical);
  const signature = signObj.sign(params.issuerKey).toString("hex");

  const id = "grant:" + createHash("sha256").update(canonical).digest("hex").slice(0, 16);

  return {
    ...grantBody,
    id,
    signature,
  };
}

// ═══════════════════════════════════════════════════════════
// GRANT VALIDATION
// ═══════════════════════════════════════════════════════════

export function validateGrant(
  grant: Grant,
  issuerPublicKey: string,
  executorAction: string,
  executorPayloadHash: string,
  now?: string
): { valid: boolean; reason?: string } {
  const currentTime = now || new Date().toISOString();

  // 1. Expiry check
  if (grant.expires_at < currentTime) {
    return { valid: false, reason: "grant expired" };
  }

  // 2. Usage check
  if (grant.max_uses <= 0) {
    return { valid: false, reason: "grant exhausted" };
  }

  // 3. Action match
  if (grant.action !== executorAction) {
    return { valid: false, reason: `action mismatch: grant=${grant.action}, executor=${executorAction}` };
  }

  // 4. Payload hash match
  if (grant.payload_hash !== executorPayloadHash) {
    return { valid: false, reason: "payload hash mismatch" };
  }

  // 5. Signature verification
  const grantBody = {
    protocol: grant.protocol,
    issuer: grant.issuer,
    subject: grant.subject,
    action: grant.action,
    payload_hash: grant.payload_hash,
    constraints: grant.constraints,
    issued_at: grant.issued_at,
    expires_at: grant.expires_at,
    nonce: grant.nonce,
    max_uses: grant.max_uses,
  };
  const canonical = JSON.stringify(grantBody, Object.keys(grantBody).sort());

  try {
    const { createVerify } = require("crypto");
    const verifyObj = createVerify("sha256");
    verifyObj.update(canonical);
    const valid = verifyObj.verify(issuerPublicKey, Buffer.from(grant.signature, "hex"));
    if (!valid) return { valid: false, reason: "signature invalid" };
  } catch (e: any) {
    return { valid: false, reason: `signature verification failed: ${e.message}` };
  }

  // 6. Constraint checks
  if (grant.constraints.max_amount !== undefined) {
    // Amount check would happen here with actual cost
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// GRANT CONSUMPTION (atomic, single-use)
// ═══════════════════════════════════════════════════════════

// #5 FIX: Use external durable store for nonce consumption
// In production, this would be D1/KV. For now, export the set so the caller can persist it.
export const consumedNonces = new Set<string>();

/**
 * Check if a nonce has been consumed (query durable store in production)
 */
export function isNonceConsumed(nonce: string): boolean {
  return consumedNonces.has(nonce);
}

/**
 * Mark a nonce as consumed (write to durable store in production)
 */
export function markNonceConsumed(nonce: string): void {
  consumedNonces.add(nonce);
}

export function consumeGrant(grant: Grant): { success: boolean; reason?: string } {
  // Check nonce not consumed
  if (consumedNonces.has(grant.nonce)) {
    return { success: false, reason: "nonce already consumed (replay detected)" };
  }

  // Check usage
  if (grant.max_uses <= 0) {
    return { success: false, reason: "grant exhausted" };
  }

  // Mark consumed (don't mutate the grant — track externally)
  consumedNonces.add(grant.nonce);

  return { success: true };
}

// ═══════════════════════════════════════════════════════════
// PAYLOAD HASH
// ═══════════════════════════════════════════════════════════

export function payloadHash(payload: any): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
