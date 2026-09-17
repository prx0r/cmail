-- qp/migrations/0001_qp_core.sql
-- QP Core Tables — the constitutional persistence layer
-- §15: Real QP tables, not doc-only schema

-- Contracts: frozen ProofSpecs
CREATE TABLE IF NOT EXISTS qp_contracts (
  contract_root TEXT PRIMARY KEY,          -- SHA256(canonical(ProofSpec))
  spec_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  canonical_json TEXT NOT NULL,            -- full ProofSpec as canonical JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Claims: exact, parameterized, immutable
CREATE TABLE IF NOT EXISTS qp_claims (
  claim_id TEXT PRIMARY KEY,               -- "claim:" + sha256(predicate + subject)
  contract_root TEXT NOT NULL REFERENCES qp_contracts(contract_root),
  predicate TEXT NOT NULL,
  subject_json TEXT NOT NULL,              -- JSON object
  statement TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Evidence: structured provenance, content-addressed
CREATE TABLE IF NOT EXISTS qp_evidence (
  evidence_id TEXT PRIMARY KEY,            -- content-addressed: sha256(payload)
  claim_id TEXT NOT NULL REFERENCES qp_claims(claim_id),
  class TEXT NOT NULL,                     -- "dns_answer", "api_response", etc.
  observed_at TEXT NOT NULL,
  source TEXT NOT NULL,
  locator TEXT NOT NULL,
  collector_id TEXT NOT NULL,
  collector_program_hash TEXT NOT NULL,
  collector_runtime_hash TEXT NOT NULL,
  request_hash TEXT,
  response_hash TEXT NOT NULL,
  normalized_payload_hash TEXT NOT NULL,
  nonce TEXT,
  independence_group TEXT NOT NULL,
  signature TEXT,
  signer TEXT,
  blob_hash TEXT,                          -- content-addressed blob storage reference
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Grants: signed authority for consequential effects
CREATE TABLE IF NOT EXISTS qp_grants (
  grant_id TEXT PRIMARY KEY,               -- "grant:" + sha256
  issuer TEXT NOT NULL,                    -- "human:<key_id>" or trusted policy
  subject TEXT NOT NULL,                   -- agent/session principal
  action TEXT NOT NULL,                    -- "cf.domain.register", etc.
  payload_hash TEXT NOT NULL,              -- exact effect payload hash
  constraints_json TEXT NOT NULL DEFAULT '{}',
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,              -- single-use enforcement
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses INTEGER NOT NULL DEFAULT 0,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',   -- active/consumed/expired/revoked
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Receipts: content-addressed, append-only
CREATE TABLE IF NOT EXISTS qp_receipts (
  receipt_hash TEXT PRIMARY KEY,           -- content-addressed identity
  protocol TEXT NOT NULL DEFAULT 'qp/1',
  transition_type TEXT NOT NULL,           -- RESOLVE/EFFECT/REVOKE
  contract_root TEXT NOT NULL REFERENCES qp_contracts(contract_root),
  claim_id TEXT NOT NULL REFERENCES qp_claims(claim_id),
  state_before_root TEXT NOT NULL,
  proposal_root TEXT NOT NULL,
  evidence_root TEXT NOT NULL,             -- merkle root of evidence IDs
  judge_results_root TEXT NOT NULL,
  gate_results_root TEXT NOT NULL,
  actuality TEXT NOT NULL,                 -- TRUE/FALSE/UNKNOWN
  authority_id TEXT,
  authority_root TEXT,
  transition_program_hash TEXT NOT NULL,
  state_after_root TEXT NOT NULL,
  run_json TEXT NOT NULL,                  -- JSON: executor, program, runtime, timing, cost
  prev_receipt_hash TEXT NOT NULL,         -- chain link
  settled_at TEXT NOT NULL,
  signer TEXT NOT NULL,
  signature TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Events: append-only event chain (hash-linked)
CREATE TABLE IF NOT EXISTS qp_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_hash TEXT NOT NULL UNIQUE,         -- SHA256(prev_hash + type + canonical(payload))
  prev_event_hash TEXT NOT NULL,           -- hash of previous event (chain)
  type TEXT NOT NULL,                      -- "claim_created", "evidence_added", "receipt_settled", etc.
  object_hash TEXT NOT NULL,               -- hash of the object this event references
  canonical_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_claims_contract ON qp_claims(contract_root);
CREATE INDEX IF NOT EXISTS idx_evidence_claim ON qp_evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_evidence_class ON qp_evidence(class, observed_at);
CREATE INDEX IF NOT EXISTS idx_grants_status ON qp_grants(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_receipts_claim ON qp_receipts(claim_id);
CREATE INDEX IF NOT EXISTS idx_receipts_contract ON qp_receipts(contract_root);
CREATE INDEX IF NOT EXISTS idx_receipts_prev ON qp_receipts(prev_receipt_hash);
CREATE INDEX IF NOT EXISTS idx_events_prev ON qp_events(prev_event_hash);
CREATE INDEX IF NOT EXISTS idx_events_type ON qp_events(type, created_at);
