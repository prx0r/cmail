// targets.ts — Target registry, dependency resolver, cost calculator
// Each platform is a "target" with structured capabilities, tasks, and costs.
// The agent reads this to know what to do and in what order.

import { readFileSync } from "fs";
import { join } from "path";

// ─── Types ───────────────────────────────────────────────────
export interface Target {
  id: string;
  name: string;
  category: "infrastructure" | "social" | "developer";
  platform?: string;               // "meta", "google", "x", "tiktok", etc.
  autonomy: "agent_guaranteed" | "agent_or_human" | "human_only";
  requires_human: boolean;
  human_action?: string;
  captcha_risk: "none" | "low" | "medium" | "high";
  cost: CostInfo;
  depends_on: string[];
  capabilities_required?: string[];
  capabilities_granted: string[];
  stack: StackInfo;
  tasks: TaskDef[];
  gates: string[];
  meta_bundle?: {                  // for Meta (Instagram → Facebook + WhatsApp)
    description: string;
    platforms: string[];
    setup_order: string[];
  };
  escalation_rules?: {
    if_captcha?: string;
    if_checkpoint?: string;
    if_phone_verify_required?: string;
    if_sms_fails?: string;
    never?: string[];
  };
  warnings?: string[];
}

export interface CostInfo {
  min: number;
  max: number;
  currency: string;
  period: string;
  free_variant: boolean;
  note: string;
  alternatives?: { name: string; cost: number; note: string }[];
}

export interface StackInfo {
  provider: string;
  api: string;
  auth: string;
  docs: string[];
}

export interface TaskDef {
  id: string;
  type: "agent" | "money" | "human" | "agent_or_human";
  action?: string;
  args?: Record<string, string>;
  method?: string;
  description?: string;
  human_gate?: boolean;
  confirm_format?: string;
  depends_on?: string[];
  captcha?: boolean;               // does this task have a captcha?
  captcha_action?: "ESCALATE_TO_HUMAN" | "SKIP" | "RETRY";  // what to do on captcha
  on_captcha?: {                   // what to tell the human
    action: string;
    message: string;
    url?: string;
    credentials?: string;
  };
}

// ─── Load all targets ────────────────────────────────────────
const TARGETS_DIR = join(__dirname, "..", "targets");

function loadTarget(filename: string): Target {
  const raw = readFileSync(join(TARGETS_DIR, filename), "utf-8");
  return JSON.parse(raw);
}

const ALL_TARGETS: Map<string, Target> = new Map();

export function loadAllTargets(): Target[] {
  const fs = require("fs");
  const files = fs.readdirSync(TARGETS_DIR).filter((f: string) => f.endsWith(".json"));
  for (const file of files) {
    const target = loadTarget(file);
    ALL_TARGETS.set(target.id, target);
  }
  return Array.from(ALL_TARGETS.values());
}

export function getTarget(id: string): Target | undefined {
  if (ALL_TARGETS.size === 0) loadAllTargets();
  return ALL_TARGETS.get(id);
}

export function listTargets(): Target[] {
  if (ALL_TARGETS.size === 0) loadAllTargets();
  return Array.from(ALL_TARGETS.values());
}

// ─── Dependency Resolution (parallel) ────────────────────────
// Returns layers: each layer can run in parallel
// Layer 0: domain (must be first)
// Layer 1: email (needs domain)
// Layer 2: phone (needs domain)
// Layer 3: ALL socials (need email ± phone) — PARALLEL
export function resolveLayers(selectedIds: string[]): string[][] {
  if (ALL_TARGETS.size === 0) loadAllTargets();

  const selected = new Set(selectedIds);
  const layers: string[][] = [];
  const resolved = new Set<string>();

  // Layer 0: things with no dependencies (domain)
  const layer0 = selectedIds.filter((id) => {
    const t = ALL_TARGETS.get(id);
    return t && t.depends_on.length === 0;
  });
  if (layer0.length) {
    layers.push(layer0);
    layer0.forEach((id) => resolved.add(id));
  }

  // Keep resolving until all selected are placed
  let maxIter = 10;
  while (resolved.size < selectedIds.length && maxIter-- > 0) {
    const nextLayer = selectedIds.filter((id) => {
      if (resolved.has(id)) return false;
      const t = ALL_TARGETS.get(id);
      if (!t) return false;
      // All deps must be resolved
      return t.depends_on.every((dep) => resolved.has(dep));
    });
    if (nextLayer.length === 0) break;
    layers.push(nextLayer);
    nextLayer.forEach((id) => resolved.add(id));
  }

  return layers;
}

// Flat resolution (backwards compat)
export function resolveOrder(selectedIds: string[]): string[] {
  return resolveLayers(selectedIds).flat();
}

// ─── Cost Calculator ─────────────────────────────────────────
export interface CostBreakdown {
  target_id: string;
  name: string;
  min_cost: number;
  max_cost: number;
  period: string;
  free: boolean;
  note: string;
  alternatives?: { name: string; cost: number }[];
}

export function calculateCosts(selectedIds: string[]): {
  total_min_monthly: number;
  total_max_monthly: number;
  total_min_yearly: number;
  total_max_yearly: number;
  free_targets: string[];
  paid_targets: CostBreakdown[];
  has_free_alternatives: boolean;
} {
  if (ALL_TARGETS.size === 0) loadAllTargets();

  const free_targets: string[] = [];
  const paid_targets: CostBreakdown[] = [];
  let totalMinMonthly = 0;
  let totalMaxMonthly = 0;

  for (const id of selectedIds) {
    const target = ALL_TARGETS.get(id);
    if (!target) continue;

    if (target.cost.free_variant && target.cost.min === 0) {
      free_targets.push(target.name);
    } else {
      const monthly = target.cost.period === "month" ? target.cost.min : target.cost.min / 12;
      const monthlyMax = target.cost.period === "month" ? target.cost.max : target.cost.max / 12;
      totalMinMonthly += monthly;
      totalMaxMonthly += monthlyMax;

      paid_targets.push({
        target_id: id,
        name: target.name,
        min_cost: target.cost.min,
        max_cost: target.cost.max,
        period: target.cost.period,
        free: false,
        note: target.cost.note,
        alternatives: target.cost.alternatives,
      });
    }
  }

  const hasFreeVariants = paid_targets.some(
    (p) => ALL_TARGETS.get(p.target_id)?.cost.alternatives?.some((a) => a.cost === 0)
  );

  return {
    total_min_monthly: Math.round(totalMinMonthly * 100) / 100,
    total_max_monthly: Math.round(totalMaxMonthly * 100) / 100,
    total_min_yearly: Math.round(totalMinMonthly * 12 * 100) / 100,
    total_max_yearly: Math.round(totalMaxMonthly * 12 * 100) / 100,
    free_targets,
    paid_targets,
    has_free_alternatives: hasFreeVariants,
  };
}

// ─── Autonomy Summary ────────────────────────────────────────
export function autonomySummary(selectedIds: string[]): {
  agent_guaranteed: string[];
  agent_or_human: string[];
  human_only: string[];
  captcha_tasks: { target: string; task: string; action: string }[];
  human_gates: { target: string; action: string; confirm_format: string }[];
  total_cost: { min_monthly: number; max_monthly: number };
} {
  if (ALL_TARGETS.size === 0) loadAllTargets();

  const agent_guaranteed: string[] = [];
  const agent_or_human: string[] = [];
  const human_only: string[] = [];
  const captcha_tasks: { target: string; task: string; action: string }[] = [];
  const human_gates: { target: string; action: string; confirm_format: string }[] = [];

  for (const id of selectedIds) {
    const target = ALL_TARGETS.get(id);
    if (!target) continue;

    switch (target.autonomy) {
      case "agent_guaranteed": agent_guaranteed.push(target.name); break;
      case "agent_or_human": agent_or_human.push(target.name); break;
      case "human_only": human_only.push(target.name); break;
    }

    // Check for captcha tasks
    for (const task of target.tasks) {
      if (task.captcha) {
        captcha_tasks.push({
          target: target.name,
          task: task.id,
          action: task.captcha_action || "ESCALATE_TO_HUMAN",
        });
      }
    }

    // Check for human gates (purchases)
    if (target.requires_human && target.human_action) {
      human_gates.push({
        target: target.name,
        action: target.human_action,
        confirm_format: target.tasks.find((t) => t.human_gate)?.confirm_format || "unknown",
      });
    }
  }

  const costs = calculateCosts(selectedIds);

  return {
    agent_guaranteed,
    agent_or_human,
    human_only,
    captcha_tasks,
    human_gates,
    total_cost: {
      min_monthly: costs.total_min_monthly,
      max_monthly: costs.total_max_monthly,
    },
  };
}

// ─── Build Dependency Grid (for display) ─────────────────────
export function buildGrid(selectedIds: string[]): string {
  const order = resolveOrder(selectedIds);
  if (ALL_TARGETS.size === 0) loadAllTargets();

  const lines: string[] = [];
  lines.push("DEPENDENCY GRID");
  lines.push("═".repeat(60));

  for (const id of order) {
    const target = ALL_TARGETS.get(id);
    if (!target) continue;

    const autIcon = target.requires_human ? "👤" :
                    target.autonomy === "agent_guaranteed" ? "🟢" :
                    target.autonomy === "agent_or_human" ? "🟡" : "🔴";
    const captchaStr = target.captcha_risk !== "none" ? ` [captcha: ${target.captcha_risk}]` : "";
    const costStr = target.cost.min === 0 ? "FREE" : `$${target.cost.min}/${target.cost.period}`;
    const deps = target.depends_on.length > 0 ? ` ← [${target.depends_on.map((d) => ALL_TARGETS.get(d)?.name || d).join(", ")}]` : "";

    lines.push("");
    lines.push(`${autIcon} ${target.name} (${costStr})${deps}`);
    lines.push(`  Grants: ${target.capabilities_granted.join(", ")}`);

    if (target.warnings) {
      lines.push(`  ⚠️  ${target.warnings.join("; ")}`);
    }
  }

  return lines.join("\n");
}
