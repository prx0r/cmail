// mcp/domain.ts — Domain Registration Capacity MCP
// Reference implementation. Shows the pattern for all other MCPs.

import type { CapacityMCP, CapacityStatus, Step, HumanTask, AgentTask, Grant, QPReceipt } from "./interface";
import { createHash } from "crypto";

export class DomainMCP implements CapacityMCP {
  readonly id = "cap:domain";
  readonly name = "Domain Registration";
  readonly category = "infra" as const;

  private domain: string;
  private cfToken: string;
  private status_: "unknown" | "checking" | "purchased" | "active" | "failed" = "unknown";
  private proof_: QPReceipt | null = null;

  constructor(domain: string, cfToken: string) {
    this.domain = domain;
    this.cfToken = cfToken;
  }

  dependsOn(): string[] {
    return []; // Domain has no dependencies — it's the root
  }

  status(): CapacityStatus {
    const steps = this.getSteps();
    const human_tasks: HumanTask[] = [];
    const agent_tasks: AgentTask[] = [];

    for (const step of steps) {
      if (step.type === "human" && step.status === "pending") {
        human_tasks.push({
          id: step.id,
          summary: step.description,
          approval_format: step.approval_format || "",
          cost: step.cost,
          url: step.url,
          unblocks: ["cap:email", "cap:phone"],
          status: "pending",
        });
      }
      if (step.type === "agent" && step.status === "pending") {
        agent_tasks.push({
          id: step.id,
          summary: step.description,
          method: step.method || "api",
          status: "pending",
        });
      }
    }

    return {
      active: this.status_ === "active",
      proof: this.proof_ || undefined,
      pending_steps: steps.filter((s) => s.status === "pending"),
      human_tasks,
      agent_tasks,
    };
  }

  nextStep(): Step | null {
    const steps = this.getSteps();
    return steps.find((s) => s.status === "pending") || null;
  }

  executeStep(stepId: string, args?: any): { step_id: string; success: boolean; proof?: string; error?: string; unblocked?: string[] } {
    const steps = this.getSteps();
    const step = steps.find((s) => s.id === stepId);
    if (!step) return { step_id: stepId, success: false, error: "step not found" };

    // Simulate execution (in production, this calls CF API)
    step.status = "done";

    if (stepId === "check_availability") {
      this.status_ = "checking";
      return {
        step_id: stepId,
        success: true,
        proof: JSON.stringify({
          domain: this.domain,
          available: true,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    if (stepId === "purchase_domain") {
      if (!args?.confirmed) {
        return { step_id: stepId, success: false, error: "needs human approval" };
      }
      this.status_ = "purchased";
      return {
        step_id: stepId,
        success: true,
        proof: JSON.stringify({
          domain: this.domain,
          purchased: true,
          price: args.price || 8.03,
          timestamp: new Date().toISOString(),
        }),
        unblocked: ["cap:email", "cap:phone"],
      };
    }

    if (stepId === "verify_zone") {
      this.status_ = "active";
      this.proof_ = this.generateProof()!;
      return {
        step_id: stepId,
        success: true,
        proof: JSON.stringify({
          domain: this.domain,
          zone_active: true,
          timestamp: new Date().toISOString(),
        }),
      };
    }

    return { step_id: stepId, success: true };
  }

  generateProof(): QPReceipt | null {
    if (this.status_ !== "active") return null;

    const evidence = JSON.stringify({
      domain: this.domain,
      zone_active: true,
      mx_records: true,
      timestamp: new Date().toISOString(),
    });

    return {
      id: "receipt:" + createHash("sha256").update(evidence).digest("hex").slice(0, 16),
      protocol: "acom/0.1",
      transition_type: "RESOLVE",
      proof_level: 7,
      subject: `cap:domain:${this.domain}`,
      evidence_root: createHash("sha256").update(evidence).digest("hex"),
      gates: [
        { id: "dns_valid_v1", result: "PASS", proof: "MX records present" },
        { id: "cf_zone_active_v1", result: "PASS", proof: "Zone active in CF account" },
      ],
      passed: true,
      created_at: new Date().toISOString(),
    };
  }

  grants(): Grant[] {
    if (this.status_ !== "active") return [];
    return [
      { capability: `have_domain:${this.domain}`, proof_level: 7 },
      { capability: `have_cloudflare_zone:${this.domain}`, proof_level: 4 },
      { capability: `can_manage_dns:${this.domain}`, proof_level: 4 },
      { capability: `receive_email:*@${this.domain}`, proof_level: 7 },
    ];
  }

  // ─── Internal ──────────────────────────────────────────
  private getSteps(): Step[] {
    return [
      {
        id: "check_availability",
        type: "agent",
        description: `Check if ${this.domain} is available on Cloudflare`,
        status: this.status_ === "unknown" ? "pending" : "done",
        method: "api",
      },
      {
        id: "purchase_domain",
        type: "money",
        description: `Buy ${this.domain} from Cloudflare Registrar`,
        status: "pending",
        approval_format: `BUY ${this.domain}`,
        cost: { amount: 8.03, currency: "USD" },
        url: `https://www.cloudflare.com/products/registrar/?query=${this.domain}`,
      },
      {
        id: "verify_zone",
        type: "agent",
        description: "Verify Cloudflare zone is active",
        status: "pending",
        method: "api",
      },
    ];
  }
}
