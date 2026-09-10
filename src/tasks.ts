// Task system — A/H/M tasks for the name acquisition pipeline
// Integrates with seed0's task framework

export interface Task {
  id: string;
  kind: "agent" | "human" | "money";
  status: "open" | "predicted" | "done" | "expired" | "blocked";
  summary: string;
  needed_from: string;
  payload: any;
  predicted: boolean;
  blocked_by: string[];
  receipts: Array<{ t: number; event: string; note?: string }>;
  created: number;
  expires: number;
}

// In-memory task store (persisted via D1 in production)
const tasks: Map<string, Task> = new Map();

export function createTask(
  kind: "agent" | "human" | "money",
  summary: string,
  opts: {
    needed_from?: string;
    payload?: any;
    blocked_by?: string[];
    ttl_hours?: number;
    confirm_text?: string;
    amount?: number;
  } = {}
): Task {
  const id = "T-" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const now = Date.now();
  const task: Task = {
    id,
    kind,
    status: "open",
    summary,
    needed_from: opts.needed_from || "human",
    payload: opts.payload || null,
    predicted: false,
    blocked_by: opts.blocked_by || [],
    receipts: [{ t: now, event: "created" }],
    created: now,
    expires: now + (opts.ttl_hours || 24) * 3600000,
  };
  tasks.set(id, task);
  return task;
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function listTasks(kind?: string): Task[] {
  return Array.from(tasks.values()).filter(t => !kind || t.kind === kind);
}

export function predictTask(id: string, mockPayload: any): Task {
  const t = tasks.get(id)!;
  t.payload = mockPayload;
  t.predicted = true;
  t.status = "predicted";
  t.receipts.push({ t: Date.now(), event: "predicted" });
  return t;
}

export function deliverTask(id: string, realPayload: any): Task {
  const t = tasks.get(id)!;
  t.payload = realPayload;
  t.predicted = false;
  t.status = "done";
  t.receipts.push({ t: Date.now(), event: "delivered" });
  return t;
}

export function completeTask(id: string): Task {
  const t = tasks.get(id)!;
  t.status = "done";
  t.receipts.push({ t: Date.now(), event: "completed" });
  return t;
}

// Get tasks that are blocking a given task
export function getBlockedBy(id: string): Task[] {
  const t = tasks.get(id);
  if (!t) return [];
  return t.blocked_by.map(bid => tasks.get(bid)!).filter(Boolean);
}

// Check if a task is ready to run (all blockers done)
export function isReady(id: string): boolean {
  const t = tasks.get(id);
  if (!t) return false;
  return t.blocked_by.every(bid => {
    const bt = tasks.get(bid);
    return bt && bt.status === "done";
  });
}
