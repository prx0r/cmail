// mcp/demo.ts — How an agent plugs into the system
// Run: npx tsx mcp/demo.ts

import { Orchestrator } from "./orchestrator";
import { DomainMCP } from "./domain";

async function main() {
  const domain = "privately.win";
  const cfToken = "test-token";

  // ─── 1. Create orchestrator ────────────────────────────
  const orch = new Orchestrator();

  // ─── 2. Register capacity MCPs ─────────────────────────
  orch.register(new DomainMCP(domain, cfToken));
  // orch.register(new EmailMCP(domain));      // coming soon
  // orch.register(new PhoneMCP());            // coming soon
  // orch.register(new YouTubeMCP(handle));    // coming soon
  // orch.register(new InstagramMCP(handle));  // coming soon

  // ─── 3. Agent evaluates the chain ──────────────────────
  console.log("=== INITIAL STATE ===");
  console.log(orch.dashboard());

  // ─── 4. Agent runs available steps ─────────────────────
  console.log("\n=== RUNNING CHECK ===");
  const result1 = orch.executeAgentTask("cap:domain", "check_availability");
  console.log("Check result:", result1);

  // ─── 5. Re-evaluate — human task now visible ───────────
  console.log("\n=== AFTER CHECK ===");
  console.log(orch.dashboard());

  // ─── 6. Human approves purchase ────────────────────────
  console.log("\n=== HUMAN APPROVES ===");
  // In real usage, human types "BUY privately.win"
  orch.approveHumanTask("purchase_domain");
  orch.executeAgentTask("cap:domain", "purchase_domain", { confirmed: true, price: 8.03 });

  // ─── 7. Agent verifies zone ────────────────────────────
  console.log("\n=== AGENT VERIFIES ZONE ===");
  orch.executeAgentTask("cap:domain", "verify_zone");

  // ─── 8. Re-evaluate — domain active, email unlocked ────
  console.log("\n=== DOMAIN ACTIVE — EMAIL UNLOCKED ===");
  console.log(orch.dashboard());

  // ─── 8. Full chain evaluation ──────────────────────────
  const eval_ = orch.evaluate();
  console.log("\n=== CHAIN STATUS ===");
  console.log("Active:", eval_.active);
  console.log("Grants:", eval_.grants);
  console.log("Human tasks:", eval_.ready_human.length);
  console.log("Agent tasks:", eval_.ready_agent.length);
  console.log("Blocked:", eval_.blocked.length);
}

main().catch(console.error);
