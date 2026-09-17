// mcp/orchestrator.ts — Chains capacity MCPs via dependency graph
// Agent plugs in here. Works the chain. Human tasks fall out. Agent tasks auto-execute.

import type { CapacityMCP, CapacityStatus, HumanTask, AgentTask, Step, QPReceipt } from "./interface";

export interface OrchestratorState {
  capacities: Map<string, CapacityStatus>;
  human_queue: HumanTask[];
  active_grants: { capability: string; from: string }[];
  receipts: QPReceipt[];
  log: LogEntry[];
}

export interface LogEntry {
  ts: string;
  event: string;
  detail: string;
}

export class Orchestrator {
  private mcps: Map<string, CapacityMCP> = new Map();
  private state: OrchestratorState;

  constructor() {
    this.state = {
      capacities: new Map(),
      human_queue: [],
      active_grants: [],
      receipts: [],
      log: [],
    };
  }

  // ─── Register MCPs ──────────────────────────────────────
  register(mcp: CapacityMCP): void {
    this.mcps.set(mcp.id, mcp);
    this.log("registered", `${mcp.id} (${mcp.name})`);
  }

  // ─── Evaluate the full chain ────────────────────────────
  evaluate(): {
    ready_agent: AgentTask[];
    ready_human: HumanTask[];
    blocked: { id: string; waiting_on: string[] }[];
    active: string[];
    grants: string[];
  } {
    const ready_agent: AgentTask[] = [];
    const ready_human: HumanTask[] = [];
    const blocked: { id: string; waiting_on: string[] }[] = [];
    const active: string[] = [];
    const grants: string[] = [];

    // Check each capacity
    for (const [id, mcp] of this.mcps) {
      const deps = mcp.dependsOn();
      const deps_active = deps.every((d) => {
        const s = this.state.capacities.get(d);
        return s?.active;
      });

      if (!deps_active) {
        const missing = deps.filter((d) => !this.state.capacities.get(d)?.active);
        blocked.push({ id, waiting_on: missing });
        continue;
      }

      const status = mcp.status();
      this.state.capacities.set(id, status);

      if (status.active) {
        active.push(id);
        for (const g of mcp.grants()) {
          grants.push(g.capability);
          this.state.active_grants.push({ capability: g.capability, from: id });
        }
        continue;
      }

      // Collect tasks
      for (const ht of status.human_tasks) {
        if (ht.status === "pending") ready_human.push(ht);
      }
      for (const at of status.agent_tasks) {
        if (at.status === "pending") ready_agent.push(at);
      }
    }

    return { ready_agent, ready_human, blocked, active, grants };
  }

  // ─── Execute an agent task ──────────────────────────────
  async executeAgentTask(
    mcpId: string,
    stepId: string,
    args?: any
  ): Promise<{ success: boolean; proof?: string; error?: string }> {
    const mcp = this.mcps.get(mcpId);
    if (!mcp) return { success: false, error: `unknown MCP: ${mcpId}` };

    this.log("executing", `${mcpId} → ${stepId}`);
    const result = mcp.executeStep(stepId, args);

    if (result.success && result.proof) {
      this.state.receipts.push(JSON.parse(result.proof));
      this.log("proof", `${mcpId}: ${result.proof.slice(0, 80)}...`);
    }

    if (!result.success) {
      this.log("failed", `${mcpId} → ${stepId}: ${result.error}`);
    }

    return result;
  }

  // ─── Process human approval ─────────────────────────────
  approveHumanTask(taskId: string): boolean {
    const task = this.state.human_queue.find((t) => t.id === taskId);
    if (!task) return false;
    task.status = "approved";
    this.log("approved", `human task: ${task.summary}`);
    return true;
  }

  // ─── Get the full picture ───────────────────────────────
  dashboard(): string {
    const lines: string[] = [];
    lines.push("╔══════════════════════════════════════════════════════╗");
    lines.push("║  setup.social — Dashboard                          ║");
    lines.push("╚══════════════════════════════════════════════════════╝");
    lines.push("");

    const eval_ = this.evaluate();

    // Active capacities
    if (eval_.active.length > 0) {
      lines.push("🟢 ACTIVE CAPACITIES:");
      for (const a of eval_.active) {
        const mcp = this.mcps.get(a);
        lines.push(`  ✅ ${mcp?.name || a}`);
      }
      lines.push("");
    }

    // Human queue
    if (eval_.ready_human.length > 0) {
      lines.push("👤 HUMAN QUEUE (need your action):");
      for (const h of eval_.ready_human) {
        lines.push(`  ┌─ ${h.summary}`);
        if (h.cost) lines.push(`  │  Cost: $${h.cost.amount} ${h.cost.currency}`);
        lines.push(`  │  Type: "${h.approval_format}"`);
        if (h.url) lines.push(`  │  URL: ${h.url}`);
        lines.push(`  │  Unlocks: ${h.unblocks.join(", ")}`);
        lines.push(`  └─`);
      }
      lines.push("");
    }

    // Agent tasks ready
    if (eval_.ready_agent.length > 0) {
      lines.push("🟢 AGENT TASKS (ready to execute):");
      for (const a of eval_.ready_agent) {
        lines.push(`  ▶ ${a.summary} [${a.method}]`);
      }
      lines.push("");
    }

    // Blocked
    if (eval_.blocked.length > 0) {
      lines.push("⏳ BLOCKED (waiting on dependencies):");
      for (const b of eval_.blocked) {
        const mcp = this.mcps.get(b.id);
        lines.push(`  🔒 ${mcp?.name || b.id} ← waiting for: ${b.waiting_on.join(", ")}`);
      }
      lines.push("");
    }

    // Grants
    if (eval_.grants.length > 0) {
      lines.push("🔑 ACTIVE GRANTS:");
      for (const g of eval_.grants) {
        lines.push(`  → ${g}`);
      }
      lines.push("");
    }

    // Log
    if (this.state.log.length > 0) {
      lines.push("📋 LOG:");
      for (const entry of this.state.log.slice(-10)) {
        lines.push(`  [${entry.ts}] ${entry.event}: ${entry.detail}`);
      }
    }

    return lines.join("\n");
  }

  // ─── Helpers ────────────────────────────────────────────
  private log(event: string, detail: string): void {
    this.state.log.push({
      ts: new Date().toISOString(),
      event,
      detail,
    });
  }
}
