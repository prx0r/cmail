// capacity.ts — Capacity registry, proof generation, chaining
// Capacities are the building blocks. Proofs verify them. Missions require them.

import { createHash } from "crypto";
import { verify, type CapacityType, type VerifyResult } from "./verifiers";

// ─── Types ───────────────────────────────────────────────────
export interface Capacity {
  id: string;                    // "cap:receive_email:agents@agentcom.org"
  type: CapacityType;
  domain: string;
  address?: string;
  status: "unknown" | "pending" | "active" | "failed";
  proof?: CapacityProof;
  created: number;
  verified_at?: number;
}

export interface CapacityProof {
  id: string;
  type: string;                  // "infrastructure_check" | "dns_verify" | "api_check"
  evidence: string;              // raw evidence (DNS output, API response, etc.)
  evidence_hash: string;
  depends_on?: string;           // hash of parent proof (for chaining)
  chain: string[];               // full ancestry hashes
  verifier: string;              // which verifier was used
  pass: boolean;
  reason?: string;
  created_at: string;
}

export interface Mission {
  id: string;
  name: string;
  domain: string;
  status: "planning" | "executing" | "waiting_human" | "complete" | "failed";
  phases: MissionPhase[];
  created: number;
  updated: number;
}

export interface MissionPhase {
  id: string;
  name: string;
  required_capacities: string[];
  task_ids: string[];
  status: "pending" | "active" | "complete" | "blocked";
}

export interface HumanAction {
  id: string;
  kind: "approve_purchase" | "provide_credential" | "manual_verify" | "sign_up";
  summary: string;
  unblocks: string[];            // task IDs
  required_capacities: string[];
  approval_format: string;
  cost?: { amount: number; currency: string };
  expires: number;
  status: "pending" | "approved" | "executed" | "expired";
}

// ─── In-memory stores ────────────────────────────────────────
const capacities = new Map<string, Capacity>();
const missions = new Map<string, Mission>();
const humanQueue: HumanAction[] = [];

// ─── Capacity Operations ─────────────────────────────────────
export function capId(type: CapacityType, address: string): string {
  return `cap:${type}:${address}`;
}

export function registerCapacity(type: CapacityType, domain: string, address?: string): Capacity {
  const id = capId(type, address ?? domain);
  const existing = capacities.get(id);
  if (existing) return existing;

  const cap: Capacity = {
    id,
    type,
    domain,
    address,
    status: "unknown",
    created: Date.now(),
  };
  capacities.set(id, cap);
  return cap;
}

export function getCapacity(id: string): Capacity | undefined {
  return capacities.get(id);
}

export function listCapacities(domain?: string): Capacity[] {
  const all = Array.from(capacities.values());
  return domain ? all.filter(c => c.domain === domain) : all;
}

// ─── Proof Generation ────────────────────────────────────────
function proofId(): string {
  return "PRF-" + createHash("sha256").update(String(Date.now()) + Math.random()).digest("hex").slice(0, 12);
}

export function generateProof(
  capId: string,
  proofType: string,
  evidence: string,
  verifierName: string,
  parentProofHash?: string,
): CapacityProof | null {
  const cap = capacities.get(capId);
  if (!null) return null;

  const result: VerifyResult = verify(cap!.type, evidence);

  const chain: string[] = [];
  if (parentProofHash) {
    chain.push(parentProofHash);
  }

  const proof: CapacityProof = {
    id: proofId(),
    type: proofType,
    evidence,
    evidence_hash: result.evidence_hash,
    depends_on: parentProofHash,
    chain,
    verifier: verifierName,
    pass: result.pass,
    reason: result.reason,
    created_at: new Date().toISOString(),
  };

  // Update capacity
  cap!.proof = proof;
  cap!.status = result.pass ? "active" : "failed";
  cap!.verified_at = Date.now();

  return proof;
}

// ─── Mission Operations ──────────────────────────────────────
export function startMission(name: string, domain: string): Mission {
  const id = "MSN-" + createHash("sha256").update(name + Date.now()).digest("hex").slice(0, 8);

  // Register all capacities this mission needs
  const domainCap = registerCapacity("have_domain", domain);
  const emailCap = registerCapacity("receive_email", domain, `agents@${domain}`);
  const zoneCap = registerCapacity("have_cloudflare_zone", domain);

  const mission: Mission = {
    id,
    name: `Set up ${domain}`,
    domain,
    status: "executing",
    phases: [
      {
        id: `${id}-P1`,
        name: "Domain Infrastructure",
        required_capacities: [domainCap.id, zoneCap.id],
        task_ids: [],
        status: "active",
      },
      {
        id: `${id}-P2`,
        name: "Email Receipt",
        required_capacities: [emailCap.id],
        task_ids: [],
        status: "blocked",
      },
      {
        id: `${id}-P3`,
        name: "Social Handles",
        required_capacities: [emailCap.id],
        task_ids: [],
        status: "blocked",
      },
    ],
    created: Date.now(),
    updated: Date.now(),
  };

  missions.set(id, mission);
  return mission;
}

export function getMission(id: string): Mission | undefined {
  return missions.get(id);
}

export function listMissions(domain?: string): Mission[] {
  const all = Array.from(missions.values());
  return domain ? all.filter(m => m.domain === domain) : all;
}

// ─── Human Queue ─────────────────────────────────────────────
export function queueHumanAction(
  kind: HumanAction["kind"],
  summary: string,
  unblocks: string[],
  requiredCapacities: string[],
  approvalFormat: string,
  cost?: { amount: number; currency: string },
  ttlHours: number = 48,
): HumanAction {
  const action: HumanAction = {
    id: "HA-" + createHash("sha256").update(summary + Date.now()).digest("hex").slice(0, 8),
    kind,
    summary,
    unblocks,
    required_capacities: requiredCapacities,
    approval_format: approvalFormat,
    cost,
    expires: Date.now() + ttlHours * 3600000,
    status: "pending",
  };
  humanQueue.push(action);
  return action;
}

export function getHumanQueue(): HumanAction[] {
  return humanQueue.filter(a => a.status === "pending" && a.expires > Date.now());
}

export function approveHumanAction(id: string): HumanAction | null {
  const action = humanQueue.find(a => a.id === id);
  if (!action || action.status !== "pending") return null;
  action.status = "approved";
  return action;
}
