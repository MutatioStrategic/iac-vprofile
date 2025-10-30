/**
 * Reusable Stage Definitions
 * Common stage configurations that can be shared across matter types
 */

const stageDefinitions = {
  // Common intake/onboarding stage
  intake: {
    name: "Intake",
    description: "Initial client intake and case information gathering",
    color: "#3B82F6",
    icon: "inbox",
    requiredFields: ["client_name", "contact_info", "case_description"],
    optionalFields: ["referral_source", "urgency", "estimated_value"],
    actions: ["schedule_consultation", "send_questionnaire", "assign_attorney"],
    nextStages: ["investigation", "consultation", "document_prep"],
    canSkip: false,
    estimatedDuration: { days: 1, unit: "business_days" }
  },

  consultation: {
    name: "Consultation",
    description: "Initial client consultation and case evaluation",
    color: "#8B5CF6",
    icon: "users",
    requiredFields: ["consultation_date", "attorney_assigned"],
    optionalFields: ["consultation_notes", "fee_structure", "retainer_amount"],
    actions: ["conduct_consultation", "send_retainer", "decline_case"],
    nextStages: ["filing", "document_prep", "closed"],
    canSkip: false,
    estimatedDuration: { days: 7, unit: "business_days" }
  },

  investigation: {
    name: "Investigation",
    description: "Fact-finding and evidence gathering",
    color: "#10B981",
    icon: "search",
    requiredFields: ["investigator_assigned"],
    optionalFields: ["investigation_plan", "evidence_collected"],
    actions: [
      "request_documents",
      "interview_witnesses",
      "site_inspection",
      "expert_consultation"
    ],
    nextStages: ["demand", "filing", "negotiation"],
    canSkip: false,
    estimatedDuration: { days: 30, unit: "calendar_days" }
  },

  filing: {
    name: "Filing",
    description: "Preparing and filing legal documents",
    color: "#F59E0B",
    icon: "file-text",
    requiredFields: ["filing_date", "court_jurisdiction"],
    optionalFields: ["case_number", "filing_fee_paid"],
    actions: ["prepare_documents", "file_with_court", "serve_parties"],
    nextStages: ["discovery", "response_pending"],
    canSkip: false,
    estimatedDuration: { days: 5, unit: "business_days" }
  },

  discovery: {
    name: "Discovery",
    description: "Exchange of information and evidence between parties",
    color: "#EC4899",
    icon: "folder-open",
    requiredFields: ["discovery_deadline"],
    optionalFields: ["interrogatories", "depositions_scheduled", "document_requests"],
    actions: [
      "send_interrogatories",
      "schedule_depositions",
      "request_documents",
      "respond_to_discovery"
    ],
    nextStages: ["mediation", "pretrial_motions", "trial"],
    canSkip: false,
    estimatedDuration: { days: 90, unit: "calendar_days" }
  },

  demand: {
    name: "Demand",
    description: "Sending demand letter or settlement proposal",
    color: "#EF4444",
    icon: "mail",
    requiredFields: ["demand_amount", "demand_date"],
    optionalFields: ["demand_letter", "supporting_docs", "response_deadline"],
    actions: ["draft_demand", "send_demand", "negotiate_response"],
    nextStages: ["negotiation", "litigation", "settlement"],
    canSkip: false,
    estimatedDuration: { days: 7, unit: "business_days" }
  },

  negotiation: {
    name: "Negotiation",
    description: "Settlement negotiations between parties",
    color: "#6366F1",
    icon: "message-square",
    requiredFields: ["negotiation_start_date"],
    optionalFields: ["offers_received", "counteroffers_sent", "settlement_range"],
    actions: ["send_counteroffer", "schedule_meeting", "draft_settlement"],
    nextStages: ["settlement", "mediation", "litigation"],
    canSkip: true,
    estimatedDuration: { days: 30, unit: "calendar_days" }
  },

  mediation: {
    name: "Mediation",
    description: "Formal mediation with neutral third party",
    color: "#14B8A6",
    icon: "scale",
    requiredFields: ["mediation_date", "mediator_name"],
    optionalFields: ["mediation_location", "mediation_statement"],
    actions: [
      "select_mediator",
      "prepare_mediation_statement",
      "attend_mediation",
      "document_outcome"
    ],
    nextStages: ["settlement", "trial", "negotiation"],
    canSkip: true,
    estimatedDuration: { days: 1, unit: "business_days" }
  },

  litigation: {
    name: "Litigation",
    description: "Active litigation and trial preparation",
    color: "#DC2626",
    icon: "briefcase",
    requiredFields: ["case_number", "court_assigned"],
    optionalFields: ["trial_date", "motions_filed"],
    actions: [
      "file_motions",
      "respond_to_motions",
      "prepare_trial_brief",
      "prepare_witnesses"
    ],
    nextStages: ["trial", "settlement", "appeal"],
    canSkip: false,
    estimatedDuration: { days: 180, unit: "calendar_days" }
  },

  pretrial_motions: {
    name: "Pre-Trial Motions",
    description: "Filing and arguing pre-trial motions",
    color: "#F97316",
    icon: "file-check",
    requiredFields: ["motion_deadline"],
    optionalFields: ["motions_filed", "hearing_dates"],
    actions: [
      "file_motion_to_dismiss",
      "file_motion_to_suppress",
      "file_summary_judgment",
      "attend_hearing"
    ],
    nextStages: ["trial", "settlement", "discovery"],
    canSkip: true,
    estimatedDuration: { days: 45, unit: "calendar_days" }
  },

  trial: {
    name: "Trial",
    description: "Court trial proceedings",
    color: "#7C3AED",
    icon: "gavel",
    requiredFields: ["trial_date", "court_room"],
    optionalFields: ["jury_selection", "witness_list", "exhibit_list"],
    actions: [
      "select_jury",
      "opening_statement",
      "present_evidence",
      "closing_argument"
    ],
    nextStages: ["verdict", "mistrial", "settlement"],
    canSkip: false,
    estimatedDuration: { days: 5, unit: "business_days" }
  },

  plea_negotiation: {
    name: "Plea Negotiation",
    description: "Negotiating plea agreement with prosecution",
    color: "#0EA5E9",
    icon: "handshake",
    requiredFields: ["prosecutor_assigned"],
    optionalFields: ["plea_offers", "client_decision"],
    actions: [
      "review_plea_offer",
      "consult_with_client",
      "negotiate_terms",
      "accept_or_decline"
    ],
    nextStages: ["sentencing", "trial", "dismissal"],
    canSkip: true,
    estimatedDuration: { days: 30, unit: "calendar_days" }
  },

  settlement: {
    name: "Settlement",
    description: "Finalizing settlement agreement",
    color: "#22C55E",
    icon: "check-circle",
    requiredFields: ["settlement_amount", "settlement_date"],
    optionalFields: ["payment_terms", "release_signed"],
    actions: [
      "draft_settlement_agreement",
      "obtain_signatures",
      "file_dismissal",
      "process_payment"
    ],
    nextStages: ["closed"],
    canSkip: false,
    estimatedDuration: { days: 14, unit: "calendar_days" }
  },

  sentencing: {
    name: "Sentencing",
    description: "Sentencing hearing and disposition",
    color: "#A855F7",
    icon: "file-text",
    requiredFields: ["sentencing_date"],
    optionalFields: ["sentencing_memo", "victim_impact_statement"],
    actions: [
      "prepare_sentencing_memo",
      "gather_character_letters",
      "attend_hearing",
      "file_appeal_notice"
    ],
    nextStages: ["closed", "appeal", "probation"],
    canSkip: false,
    estimatedDuration: { days: 1, unit: "business_days" }
  },

  closing: {
    name: "Closing",
    description: "Transaction closing and final documents",
    color: "#059669",
    icon: "home",
    requiredFields: ["closing_date", "closing_location"],
    optionalFields: ["closing_disclosure", "wire_instructions"],
    actions: [
      "prepare_closing_docs",
      "coordinate_with_parties",
      "conduct_closing",
      "record_documents"
    ],
    nextStages: ["closed"],
    canSkip: false,
    estimatedDuration: { days: 1, unit: "business_days" }
  },

  closed: {
    name: "Closed",
    description: "Case completed and closed",
    color: "#6B7280",
    icon: "archive",
    requiredFields: ["close_date", "outcome"],
    optionalFields: ["final_notes", "lessons_learned"],
    actions: ["archive_case", "send_final_invoice", "request_review"],
    nextStages: [],
    canSkip: false,
    isFinal: true
  }
};

/**
 * Get stage definition by key
 */
function getStageDefinition(stageKey) {
  if (!stageDefinitions[stageKey]) {
    throw new Error(`Stage definition '${stageKey}' not found`);
  }
  return stageDefinitions[stageKey];
}

/**
 * Get all stage definitions
 */
function getAllStageDefinitions() {
  return Object.keys(stageDefinitions).map(key => ({
    key,
    ...stageDefinitions[key]
  }));
}

/**
 * Validate if a stage exists
 */
function isValidStage(stageKey) {
  return !!stageDefinitions[stageKey];
}

/**
 * Check if a stage transition is valid
 */
function isValidTransition(fromStage, toStage) {
  const stage = getStageDefinition(fromStage);
  return stage.nextStages.includes(toStage);
}

/**
 * Get color for a stage
 */
function getStageColor(stageKey) {
  const stage = getStageDefinition(stageKey);
  return stage.color;
}

module.exports = {
  stageDefinitions,
  getStageDefinition,
  getAllStageDefinitions,
  isValidStage,
  isValidTransition,
  getStageColor
};
