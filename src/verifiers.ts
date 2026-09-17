// verifiers.ts — Pure function verifiers for each capacity type
// Every verifier takes raw evidence (string) and returns {pass, reason?}
// No I/O. No side effects. Deterministic.

import { createHash } from "crypto";

export interface VerifyResult {
  pass: boolean;
  reason?: string;
  evidence_hash: string;
}

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// ─── have_domain ─────────────────────────────────────────────
// Evidence: dig MX output + CF zone API response
// Pass: MX records point to cloudflare + zone is active
export function verifyDomain(evidence: string): VerifyResult {
  const hasMX = /route\d+\.mx\.cloudflare\.net/.test(evidence);
  const hasSPF = /v=spf1/.test(evidence);
  const zoneActive = /status["\s:=]+active/i.test(evidence) ||
                     /"status":"active"/.test(evidence);

  if (!hasMX) return { pass: false, reason: "no cloudflare MX records", evidence_hash: sha256(evidence) };
  if (!hasSPF) return { pass: false, reason: "no SPF record", evidence_hash: sha256(evidence) };
  if (!zoneActive) return { pass: false, reason: "CF zone not active", evidence_hash: sha256(evidence) };

  return { pass: true, evidence_hash: sha256(evidence) };
}

// ─── receive_email ───────────────────────────────────────────
// Evidence: JSON with layers 1-6 results
// Pass: all infrastructure layers green
export interface EmailEvidence {
  mx_records: string[];
  spf_record: string;
  dmarc_record?: string;
  zone_id: string;
  zone_status: string;
  routing_rules: number;
  catch_all: boolean;
  worker_live: boolean;
  mailbox_indexed: boolean;
}

export function verifyReceiveEmail(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  let e: EmailEvidence;
  try {
    e = JSON.parse(evidence);
  } catch {
    return { pass: false, reason: "invalid JSON evidence", evidence_hash: hash };
  }

  const failures: string[] = [];

  // L1: MX records present and point to Cloudflare
  if (!e.mx_records?.length) failures.push("no MX records");
  else if (!e.mx_records.some(r => /cloudflare/i.test(r))) failures.push("MX not cloudflare");

  // L2: SPF present
  if (!e.spf_record) failures.push("no SPF");
  else if (!/v=spf1/.test(e.spf_record)) failures.push("SPF invalid");

  // L3: Zone active (DMARC recommended but not blocking)
  if (!e.zone_id) failures.push("no CF zone");
  else if (e.zone_status !== "active") failures.push(`zone status: ${e.zone_status}`);

  // L4: Routing rules exist with catch-all
  if (e.routing_rules < 1) failures.push("no routing rules");
  if (!e.catch_all) failures.push("no catch-all rule");

  // L5: Worker responding
  if (!e.worker_live) failures.push("worker not live");

  // L6: Mailbox indexed
  if (!e.mailbox_indexed) failures.push("mailbox not indexed");

  if (failures.length > 0) {
    return { pass: false, reason: failures.join("; "), evidence_hash: hash };
  }

  return { pass: true, evidence_hash: hash };
}

// ─── have_handle ─────────────────────────────────────────────
// Evidence: JSON {platform, status, marker_found?}
// Pass: status is "available" or "owned"
export function verifyHandle(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  let e: { platform: string; status: string; owned?: boolean };
  try {
    e = JSON.parse(evidence);
  } catch {
    return { pass: false, reason: "invalid JSON evidence", evidence_hash: hash };
  }

  if (e.owned || e.status === "available" || e.status === "owned") {
    return { pass: true, evidence_hash: hash };
  }

  return { pass: false, reason: `handle ${e.platform}: ${e.status}`, evidence_hash: hash };
}

// ─── have_phone ──────────────────────────────────────────────
// Evidence: JSON {number, features, monthly_cost}
// Pass: number is present and starts with +
export function verifyPhone(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  let e: { number: string };
  try {
    e = JSON.parse(evidence);
  } catch {
    return { pass: false, reason: "invalid JSON evidence", evidence_hash: hash };
  }

  if (e.number && e.number.startsWith("+")) {
    return { pass: true, evidence_hash: hash };
  }

  return { pass: false, reason: "no valid phone number", evidence_hash: hash };
}

// ─── have_cloudflare_zone ────────────────────────────────────
// Evidence: JSON {zone_id, status, name_servers}
// Pass: zone active
export function verifyCFZone(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  let e: { zone_id: string; status: string };
  try {
    e = JSON.parse(evidence);
  } catch {
    return { pass: false, reason: "invalid JSON evidence", evidence_hash: hash };
  }

  if (e.zone_id && e.status === "active") {
    return { pass: true, evidence_hash: hash };
  }

  return { pass: false, reason: `zone status: ${e.status || "missing"}`, evidence_hash: hash };
}

// ─── can_send_email ──────────────────────────────────────────
// Evidence: JSON {method, message_id, delivery_status}
// Pass: message_id present and delivery accepted
export function verifySendEmail(evidence: string): VerifyResult {
  const hash = sha256(evidence);
  let e: { message_id?: string; delivery_status?: string };
  try {
    e = JSON.parse(evidence);
  } catch {
    return { pass: false, reason: "invalid JSON evidence", evidence_hash: hash };
  }

  if (e.message_id && (!e.delivery_status || e.delivery_status !== "failed")) {
    return { pass: true, evidence_hash: hash };
  }

  return { pass: false, reason: "send not confirmed", evidence_hash: hash };
}

// ─── Verifier dispatch ───────────────────────────────────────
export type CapacityType =
  | "have_domain"
  | "receive_email"
  | "have_handle"
  | "have_phone"
  | "have_cloudflare_zone"
  | "can_send_email";

const VERIFIERS: Record<CapacityType, (evidence: string) => VerifyResult> = {
  have_domain: verifyDomain,
  receive_email: verifyReceiveEmail,
  have_handle: verifyHandle,
  have_phone: verifyPhone,
  have_cloudflare_zone: verifyCFZone,
  can_send_email: verifySendEmail,
};

export function verify(type: CapacityType, evidence: string): VerifyResult {
  const fn = VERIFIERS[type];
  if (!fn) return { pass: false, reason: `unknown capacity type: ${type}`, evidence_hash: sha256(evidence) };
  return fn(evidence);
}
