// qp/identity.ts — Source/build identity for QP programs
// Every QP program/probe/adapter record must pin:
// - git repository, commit SHA, tree SHA
// - build hash, program bundle hash
// - runtime/dependency lock hash
// - deployment identifier
// Never use master/main/latest/mutable tags inside proof roots.

import { createHash } from "crypto";
import { execSync } from "child_process";

// ═══════════════════════════════════════════════════════════
// PROGRAM IDENTITY — pinned to immutable bytes
// ═══════════════════════════════════════════════════════════

export interface ProgramIdentity {
  id: string;                    // "prog:sha256hex"
  name: string;                  // human-readable
  source_hash: string;           // SHA-256 of source code
  runtime_hash: string;          // runtime identifier (e.g. "node:20", "bash:5")
  config_hash: string;           // SHA-256 of config
  dependency_hash: string;       // SHA-256 of dependency lock
  bundle_hash: string;           // SHA-256 of all above combined
  git_repo?: string;
  git_commit?: string;           // commit SHA (never branch name)
  git_tree?: string;             // tree SHA
  build_hash?: string;           // build artifact hash
  deployment_id?: string;        // deployment identifier
  created_at: string;
}

/**
 * Create a program identity from source code.
 * The source_hash is the canonical hash of the program source.
 */
export function createProgramIdentity(params: {
  name: string;
  source: string;
  runtime: string;
  config?: string;
  dependencies?: string;
  gitRepo?: string;
  gitCommit?: string;
  gitTree?: string;
  buildHash?: string;
  deploymentId?: string;
}): ProgramIdentity {
  const source_hash = sha256(params.source);
  const runtime_hash = sha256(params.runtime);
  const config_hash = sha256(params.config || "default");
  const dependency_hash = sha256(params.dependencies || "none");

  const bundle_hash = sha256(
    source_hash + runtime_hash + config_hash + dependency_hash
  );

  const id = "prog:" + bundle_hash.slice(0, 16);

  return {
    id,
    name: params.name,
    source_hash,
    runtime_hash,
    config_hash,
    dependency_hash,
    bundle_hash,
    git_repo: params.gitRepo,
    git_commit: params.gitCommit,
    git_tree: params.gitTree,
    build_hash: params.buildHash,
    deployment_id: params.deploymentId,
    created_at: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════
// GIT IDENTITY — extract from current repo
// ═══════════════════════════════════════════════════════════

export interface GitIdentity {
  repo: string;
  commit: string;    // full SHA
  tree: string;      // tree SHA
  branch: string;    // current branch (for reference only, NOT in proof roots)
  dirty: boolean;    // uncommitted changes
}

export function getGitIdentity(cwd?: string): GitIdentity | null {
  try {
    const dir = cwd || process.cwd();
    const commit = execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf-8" }).trim();
    const tree = execSync("git rev-parse HEAD^{tree}", { cwd: dir, encoding: "utf-8" }).trim();
    const branch = execSync("git branch --show-current", { cwd: dir, encoding: "utf-8" }).trim();
    const status = execSync("git status --porcelain", { cwd: dir, encoding: "utf-8" }).trim();
    const remote = execSync("git remote get-url origin", { cwd: dir, encoding: "utf-8" }).trim();

    return {
      repo: remote,
      commit,
      tree,
      branch,
      dirty: status.length > 0,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// BUNDLE HASH — content-addressed program bundle
// ═══════════════════════════════════════════════════════════

export interface ProgramBundle {
  id: string;
  source_hash: string;
  runtime_hash: string;
  config_hash: string;
  dependency_hash: string;
  bundle_hash: string;
}

export function createBundle(source: string, runtime: string, config?: string, deps?: string): ProgramBundle {
  const source_hash = sha256(source);
  const runtime_hash = sha256(runtime);
  const config_hash = sha256(config || "default");
  const dependency_hash = sha256(deps || "none");
  const bundle_hash = sha256(source_hash + runtime_hash + config_hash + dependency_hash);

  return {
    id: "bundle:" + bundle_hash.slice(0, 16),
    source_hash,
    runtime_hash,
    config_hash,
    dependency_hash,
    bundle_hash,
  };
}

// ═══════════════════════════════════════════════════════════
// PROOFSPEC BINDING — pin program identity to ProofSpec
// ═══════════════════════════════════════════════════════════

/**
 * When creating a ProofSpec, each judge and gate must reference
 * a ProgramBundle by bundle_hash, not just a friendly name.
 * This ensures semantic changes mint a new ContractRoot.
 */
export function pinProgramToSpec(
  spec: { judges: Array<{ id: string; program_hash: string }>; gates: Array<{ id: string; program_hash: string }> },
  programMap: Record<string, ProgramBundle>
): void {
  for (const judge of spec.judges) {
    const bundle = programMap[judge.id];
    if (bundle) {
      judge.program_hash = bundle.bundle_hash;
    }
  }
  for (const gate of spec.gates) {
    const bundle = programMap[gate.id];
    if (bundle) {
      gate.program_hash = bundle.bundle_hash;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
