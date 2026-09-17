// qp/edges.ts — Typed edges for the QP dependency graph
// §12: Replace GRANT graph with typed edges
// REQUIRES | DERIVES | ENABLES | AUTHORIZES | EFFECTS | VERIFIES

// ═══════════════════════════════════════════════════════════
// EDGE TYPES — the six canonical relationships
// ═══════════════════════════════════════════════════════════

export type EdgeType =
  | "REQUIRES"    // A requires B to be TRUE before A can be evaluated
  | "DERIVES"     // A is derived from B (B is evidence for A)
  | "ENABLES"     // A being TRUE enables action B
  | "AUTHORIZES"  // Signed grant A authorizes effect B
  | "EFFECTS"     // Action A effects world-state transition B
  | "VERIFIES";   // Evidence A verifies claim B

export interface Edge {
  id: string;                    // "edge:" + sha256
  type: EdgeType;
  source: string;                // claim_id or grant_id or evidence_id
  target: string;                // claim_id or action or effect
  metadata?: Record<string, any>;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════
// EDGE CONSTRUCTORS
// ═══════════════════════════════════════════════════════════

import { createHash } from "crypto";

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function makeEdge(type: EdgeType, source: string, target: string, metadata?: Record<string, any>): Edge {
  const id = "edge:" + sha256(type + source + target);
  return { id, type, source, target, metadata, created_at: new Date().toISOString() };
}

/**
 * REQUIRES: A requires B to be TRUE before A can be evaluated.
 * Example: email_receives(A) REQUIRES dns_configured(A)
 */
export function requires(from: string, to: string): Edge {
  return makeEdge("REQUIRES", from, to);
}

/**
 * DERIVES: A is derived from B (B is evidence for A).
 * Example: email_receives(A) DERIVES email_route_configured(A)
 */
export function derives(from: string, to: string): Edge {
  return makeEdge("DERIVES", from, to);
}

/**
 * ENABLES: A being TRUE enables action B.
 * Example: domain_owned(D) ENABLES configure_dns(D)
 * Example: email_receives(A) ENABLES signup(platform, A)
 */
export function enables(from: string, to: string): Edge {
  return makeEdge("ENABLES", from, to);
}

/**
 * AUTHORIZES: Signed grant A authorizes effect B.
 * Example: signed Grant AUTHORIZES cf.domain.register(payload_hash)
 */
export function authorizes(from: string, to: string): Edge {
  return makeEdge("AUTHORIZES", from, to);
}

/**
 * EFFECTS: Action A effects world-state transition B.
 * Example: provider effect EFFECTS candidate world transition
 */
export function effects(from: string, to: string): Edge {
  return makeEdge("EFFECTS", from, to);
}

/**
 * VERIFIES: Evidence A verifies claim B.
 * Example: readback evidence VERIFIES target claim
 */
export function verifies(from: string, to: string): Edge {
  return makeEdge("VERIFIES", from, to);
}

// ═══════════════════════════════════════════════════════════
// EDGE GRAPH — query the dependency graph
// ═══════════════════════════════════════════════════════════

export class EdgeGraph {
  private edges: Edge[] = [];

  add(edge: Edge): void {
    this.edges.push(edge);
  }

  /**
   * Get all edges of a specific type from a source.
   */
  from(source: string, type?: EdgeType): Edge[] {
    return this.edges.filter(
      (e) => e.source === source && (!type || e.type === type)
    );
  }

  /**
   * Get all edges of a specific type to a target.
   */
  to(target: string, type?: EdgeType): Edge[] {
    return this.edges.filter(
      (e) => e.target === target && (!type || e.type === type)
    );
  }

  /**
   * Get all requirements FOR a claim (what this claim needs to be TRUE).
   */
  requirements(claimId: string): string[] {
    return this.from(claimId, "REQUIRES").map((e) => e.target);
  }

  /**
   * Get all things enabled by a claim being TRUE.
   */
  enabledBy(claimId: string): string[] {
    return this.from(claimId, "ENABLES").map((e) => e.target);
  }

  /**
   * Get all evidence that verifies a claim.
   */
  evidenceFor(claimId: string): string[] {
    return this.to(claimId, "VERIFIES").map((e) => e.source);
  }

  /**
   * Get all effects authorized by a grant.
   */
  authorizedEffects(grantId: string): string[] {
    return this.from(grantId, "AUTHORIZES").map((e) => e.target);
  }

  /**
   * Topological sort of claims by REQUIRES edges.
   * Returns claims in evaluation order (dependencies first).
   */
  evaluationOrder(): string[] {
    const claims = new Set<string>();
    for (const e of this.edges) {
      claims.add(e.source);
      claims.add(e.target);
    }

    const visited = new Set<string>();
    const order: string[] = [];
    const self = this;

    function visit(id: string) {
      if (visited.has(id)) return;
      visited.add(id);
      for (const req of self.to(id, "REQUIRES")) {
        visit(req.source);
      }
      order.push(id);
    }

    for (const c of claims) {
      visit(c);
    }

    return order;
  }

  /**
   * Export all edges.
   */
  all(): Edge[] {
    return [...this.edges];
  }
}

// ═══════════════════════════════════════════════════════════
// CMAIL EDGE EXAMPLES
// ═══════════════════════════════════════════════════════════

/**
 * Build the canonical edge graph for a domain setup chain.
 */
export function buildDomainChain(domain: string, handle: string): EdgeGraph {
  const graph = new EdgeGraph();

  // Infrastructure chain
  const domainAvail = `claim:domain_available:${domain}`;
  const domainOwned = `claim:domain_owned:${domain}`;
  const dnsConfig = `claim:dns_configured:${domain}`;
  const emailRoute = `claim:email_route_configured:agents@${domain}`;
  const emailReceives = `claim:email_receives:agents@${domain}`;

  graph.add(requires(domainOwned, domainAvail));
  graph.add(requires(dnsConfig, domainOwned));
  graph.add(requires(emailRoute, dnsConfig));
  graph.add(requires(emailReceives, emailRoute));
  graph.add(requires(emailReceives, dnsConfig));

  // Enablement chain
  graph.add(enables(domainOwned, `action:configure_dns:${domain}`));
  graph.add(enables(emailReceives, `action:signup:youtube:${handle}`));
  graph.add(enables(emailReceives, `action:signup:instagram:${handle}`));
  graph.add(enables(emailReceives, `action:signup:tiktok:${handle}`));
  graph.add(enables(emailReceives, `action:signup:x:${handle}`));

  // Authority chain
  graph.add(authorizes(`grant:purchase_domain:${domain}`, domainOwned));

  // Verification chain
  graph.add(verifies(`evidence:cf_zone_readback:${domain}`, domainOwned));
  graph.add(verifies(`evidence:dns_query:${domain}`, dnsConfig));
  graph.add(verifies(`evidence:nonce_roundtrip:agents@${domain}`, emailReceives));

  return graph;
}
