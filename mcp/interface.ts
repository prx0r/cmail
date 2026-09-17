// mcp/interface.ts — The Capacity MCP Interface
// Every capacity implements this exact interface. Same shape, different guts.
// The orchestrator doesn't know what each MCP does — it just calls the interface.

export interface CapacityMCP {
  // ─── Identity ────────────────────────────────────────────
  readonly id: string;                    // "cap:domain", "cap:email", "cap:youtube"
  readonly name: string;                  // "Domain Registration"
  readonly category: "infra" | "social" | "phone";

  // ─── Dependencies ────────────────────────────────────────
  dependsOn(): string[];                  // ["cap:domain"] or []

  // ─── Status ──────────────────────────────────────────────
  status(): CapacityStatus;
  // Returns: { active, proof, pending_steps, human_tasks, agent_tasks }

  // ─── Execution ───────────────────────────────────────────
  nextStep(): Step | null;
  // Returns the next actionable step, or null if done/blocked
  // Step can be agent-auto or human-required

  executeStep(stepId: string, args?: any): StepResult;
  // Execute a step. Returns success/failure + updated state.

  // ─── Proof ───────────────────────────────────────────────
  generateProof(): QPReceipt | null;
  // Generate QP proof if capacity is active. Null if not ready.

  // ─── Grants ──────────────────────────────────────────────
  grants(): Grant[];
  // What this capacity unlocks when active
}

// ─── Shared Types ─────────────────────────────────────────

export interface CapacityStatus {
  active: boolean;
  proof?: QPReceipt;
  pending_steps: Step[];
  human_tasks: HumanTask[];
  agent_tasks: AgentTask[];
}

export interface Step {
  id: string;
  type: "agent" | "human" | "money";
  description: string;
  status: "pending" | "ready" | "done" | "blocked";
  depends_on?: string[];
  // For human steps:
  approval_format?: string;              // "BUY privately.win"
  cost?: { amount: number; currency: string };
  url?: string;                          // URL to open
  // For agent steps:
  method?: "api" | "playwright" | "bash";
  api_call?: { service: string; method: string; args?: Record<string, any> };
  browser_action?: { url: string; steps: string[] };
}

export interface StepResult {
  step_id: string;
  success: boolean;
  proof?: string;                        // evidence string for QP
  error?: string;
  unblocked?: string[];                  // step IDs now unblocked
}

export interface HumanTask {
  id: string;
  summary: string;
  approval_format: string;
  cost?: { amount: number; currency: string };
  url?: string;
  unblocks: string[];
  status: "pending" | "approved" | "expired";
}

export interface AgentTask {
  id: string;
  summary: string;
  method: "api" | "playwright" | "bash";
  status: "pending" | "running" | "done" | "failed";
}

export interface Grant {
  capability: string;                    // "receive_email", "have_handle:youtube"
  proof_level: number;                   // V4, V7, V9, V12
  constraints?: Record<string, any>;
}

export interface QPReceipt {
  id: string;
  protocol: "acom/0.1";
  transition_type: "RESOLVE";
  proof_level: number;
  subject: string;                       // "cap:domain:privately.win"
  evidence_root: string;                 // SHA-256 of evidence
  gates: { id: string; result: "PASS" | "FAIL"; proof: string }[];
  passed: boolean;
  created_at: string;
}
