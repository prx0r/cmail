// Pipeline — orchestrates the full name acquisition flow
// Agent checks domains/socials → creates human tasks → waits for delivery → continues

import { createTask, deliverTask, completeTask, listTasks, isReady } from "./tasks";

export interface PipelineState {
  name: string;
  domain?: string;
  email?: string;
  phone?: string;
  socials: Record<string, string>; // platform -> handle
  tasks: string[];
  status: "checking" | "waiting_human" | "purchasing" | "signing_up" | "complete";
}

// Start pipeline for a name
export function startPipeline(name: string): { pipeline: PipelineState; tasks: any[] } {
  const tasks = [];

  // Agent task: check domain availability (already done via MCP)

  // Agent task: check social handles (already done via MCP)

  // Human task: provide email address
  const emailTask = createTask("human", "Provide email address for " + name, {
    needed_from: "human",
    payload: { predicted: name + "@egoic.ai" },
    ttl_hours: 24,
  });
  tasks.push(emailTask);

  // Human task: provide phone number (blocked by email task)
  const phoneTask = createTask("human", "Provide phone number for " + name, {
    needed_from: "human",
    blocked_by: [emailTask.id],
    payload: { predicted: "+15555551234" },
    ttl_hours: 24,
  });
  tasks.push(phoneTask);

  // Agent task: buy domain (blocked by human approval)
  const buyTask = createTask("money", "Buy " + name + ".trade for $2.98", {
    needed_from: "human",
    blocked_by: [emailTask.id],
    payload: { domain: name + ".trade", price: 2.98 },
    confirm_text: "BUY " + name + ".trade",
    ttl_hours: 48,
  });
  tasks.push(buyTask);

  // Agent task: wire email (blocked by domain purchase)
  const wireTask = createTask("agent", "Wire email for " + name + ".trade", {
    blocked_by: [buyTask.id],
  });
  tasks.push(wireTask);

  // Agent tasks: sign up for socials (blocked by email + phone)
  const socialPlatforms = ["github", "x", "youtube", "npm", "bluesky", "gitlab"];
  for (const platform of socialPlatforms) {
    const signupTask = createTask("agent", "Sign up " + platform + " as " + name, {
      blocked_by: [emailTask.id, phoneTask.id],
    });
    tasks.push(signupTask);
  }

  return {
    pipeline: {
      name,
      socials: {},
      tasks: tasks.map(t => t.id),
      status: "checking",
    },
    tasks,
  };
}
