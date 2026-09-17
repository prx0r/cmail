// integrations/receipts/qp-extension.ts — QP Extension for Agent Receipts (Obsigna)
// Maps QP semantics into the Agent Receipt Protocol envelope.
// QP owns the claim/evidence/judge/settlement layer.
// Agent Receipts own the cryptographic envelope, signing, chaining, portability.

export interface QPReceiptExtension {
  // QP-specific fields carried inside Agent Receipt envelope
  qp_contract_root: string;        // frozen ProofSpec identity
  qp_claim_id: string;             // exact claim
  qp_actuality: "TRUE" | "FALSE" | "UNKNOWN";
  qp_evidence_root: string;        // merkle root of evidence
  qp_judge_results_root: string;   // merkle root of judge results
  qp_gate_results_root: string;    // merkle root of gate results
  qp_effect_bundle_hash?: string;  // Monid/adapter bundle hash
  qp_observer_bundle_hash?: string; // readback bundle hash
  qp_independence_policy_hash: string;
  qp_authority_ref?: string;       // grant_id, not the grant itself
  qp_state_before_root: string;
  qp_state_after_root: string;
  qp_replay_result: "PASS" | "FAIL";
}

// The Agent Receipt envelope wraps QP semantics in a portable signed record.
// Obsigna provides: canonical JSON, Ed25519 signatures, hash chaining,
// out-of-process signing, cross-language verification.

export function toAgentReceipt(
  qpReceipt: any,  // TransitionReceipt
  actionType: string,
  riskLevel: string
): {
  envelope: Record<string, any>;
  qp_extension: QPReceiptExtension;
} {
  // Map QP fields to Agent Receipt envelope
  const envelope = {
    "@context": "https://agent-receipts.org/contexts/v1",
    "type": "AgentActionReceipt",
    "action": {
      "type": actionType,
      "risk_level": riskLevel,
      "timestamp": qpReceipt.settled_at,
    },
    "agent": {
      "id": qpReceipt.qp_signer,
    },
    "evidence": {
      "root": qpReceipt.evidence_root,
      "count": qpReceipt.gate_results_root ? 1 : 0,
    },
    "verification": {
      "replay_result": qpReceipt.receipt_hash ? "PASS" : "FAIL",
      "receipt_hash": qpReceipt.receipt_hash,
    },
  };

  // QP extension (carried alongside the envelope)
  const qp_extension: QPReceiptExtension = {
    qp_contract_root: qpReceipt.contract_root,
    qp_claim_id: qpReceipt.claim_id,
    qp_actuality: qpReceipt.actuality,
    qp_evidence_root: qpReceipt.evidence_root,
    qp_judge_results_root: qpReceipt.judge_results_root,
    qp_gate_results_root: qpReceipt.gate_results_root,
    qp_independence_policy_hash: "",
    qp_state_before_root: qpReceipt.state_before_root,
    qp_state_after_root: qpReceipt.state_after_root,
    qp_replay_result: qpReceipt.receipt_hash ? "PASS" : "FAIL",
  };

  return { envelope, qp_extension };
}

// Parse Agent Receipt back to QP TransitionReceipt
export function fromAgentReceipt(
  envelope: Record<string, any>,
  qp_extension: QPReceiptExtension
): any {
  return {
    protocol: "qp/1",
    transition_type: "EFFECT",
    contract_root: qp_extension.qp_contract_root,
    claim_id: qp_extension.qp_claim_id,
    actuality: qp_extension.qp_actuality,
    evidence_root: qp_extension.qp_evidence_root,
    judge_results_root: qp_extension.qp_judge_results_root,
    gate_results_root: qp_extension.qp_gate_results_root,
    state_before_root: qp_extension.qp_state_before_root,
    state_after_root: qp_extension.qp_state_after_root,
    receipt_hash: envelope.verification?.receipt_hash || "",
  };
}
