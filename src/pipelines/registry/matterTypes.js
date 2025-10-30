/**
 * Case Management Pipeline Registry
 * Single source of truth for all matter type configurations
 */

const matterTypes = {
  personal_injury: {
    name: "Personal Injury",
    description: "Motor vehicle accidents, slip and fall, medical malpractice",
    stages: ["intake", "investigation", "demand", "litigation", "settlement"],
    documents: [
      "medical_records",
      "police_report",
      "incident_photos",
      "witness_statements",
      "settlement_agreement",
      "release_forms"
    ],
    notifications: [
      "client_update",
      "deadline_reminder",
      "document_request",
      "settlement_offer"
    ],
    permissions: {
      lawyer: ["read", "write", "approve", "delete"],
      paralegal: ["read", "write"],
      client: ["read"],
      admin: ["read", "write", "approve", "delete", "manage"]
    },
    realtime_events: [
      "stage_change",
      "document_upload",
      "deadline_approaching",
      "settlement_offer_received",
      "court_date_scheduled"
    ],
    automations: {
      on_intake_complete: ["send_welcome_email", "assign_investigator"],
      on_demand_sent: ["set_response_deadline", "schedule_follow_up"],
      on_settlement_reached: ["generate_settlement_docs", "notify_all_parties"]
    },
    sla: {
      intake_to_investigation: { days: 3, unit: "business_days" },
      investigation_to_demand: { days: 30, unit: "calendar_days" },
      demand_to_response: { days: 30, unit: "calendar_days" }
    }
  },

  family_law: {
    name: "Family Law",
    description: "Divorce, custody, child support, domestic relations",
    stages: ["consultation", "filing", "discovery", "mediation", "trial", "post_decree"],
    documents: [
      "petition",
      "financial_affidavit",
      "parenting_plan",
      "settlement_agreement",
      "decree",
      "modification_request"
    ],
    notifications: [
      "court_date_reminder",
      "mediation_scheduled",
      "document_filed",
      "custody_evaluation"
    ],
    permissions: {
      lawyer: ["read", "write", "approve", "delete"],
      paralegal: ["read", "write"],
      client: ["read", "upload_documents"],
      mediator: ["read", "write_notes"],
      admin: ["read", "write", "approve", "delete", "manage"]
    },
    realtime_events: [
      "stage_change",
      "document_upload",
      "court_date_scheduled",
      "mediation_scheduled",
      "settlement_proposed",
      "decree_issued"
    ],
    automations: {
      on_consultation_complete: ["send_retainer_agreement", "create_case_folder"],
      on_filing_complete: ["schedule_court_date", "notify_opposing_counsel"],
      on_mediation_failed: ["prepare_trial_docs", "schedule_trial_prep"]
    },
    sla: {
      consultation_to_filing: { days: 14, unit: "business_days" },
      filing_to_discovery: { days: 60, unit: "calendar_days" },
      mediation_to_trial: { days: 90, unit: "calendar_days" }
    }
  },

  criminal_defense: {
    name: "Criminal Defense",
    description: "Criminal charges, DUI/DWI, drug offenses",
    stages: [
      "arraignment",
      "discovery",
      "pretrial_motions",
      "plea_negotiation",
      "trial",
      "sentencing"
    ],
    documents: [
      "charging_document",
      "police_report",
      "evidence_list",
      "motion_to_suppress",
      "plea_agreement",
      "sentencing_memo"
    ],
    notifications: [
      "court_appearance",
      "plea_offer_received",
      "discovery_deadline",
      "trial_date_set"
    ],
    permissions: {
      lawyer: ["read", "write", "approve", "delete"],
      paralegal: ["read", "write"],
      client: ["read", "upload_documents"],
      investigator: ["read", "write_notes"],
      admin: ["read", "write", "approve", "delete", "manage"]
    },
    realtime_events: [
      "stage_change",
      "court_date_scheduled",
      "plea_offer_received",
      "evidence_disclosed",
      "verdict_rendered"
    ],
    automations: {
      on_arraignment_complete: ["request_discovery", "file_appearance"],
      on_plea_offer_received: ["notify_client", "schedule_consultation"],
      on_trial_verdict: ["prepare_sentencing_docs", "notify_all_parties"]
    },
    sla: {
      arraignment_to_discovery: { days: 7, unit: "business_days" },
      discovery_to_pretrial: { days: 30, unit: "calendar_days" },
      plea_to_trial: { days: 60, unit: "calendar_days" }
    }
  },

  real_estate: {
    name: "Real Estate",
    description: "Property transactions, closings, title disputes",
    stages: [
      "contract_review",
      "title_search",
      "inspection",
      "financing",
      "closing_prep",
      "closing"
    ],
    documents: [
      "purchase_agreement",
      "title_report",
      "inspection_report",
      "loan_documents",
      "deed",
      "closing_statement"
    ],
    notifications: [
      "inspection_contingency",
      "financing_deadline",
      "closing_date_set",
      "title_issue_found"
    ],
    permissions: {
      lawyer: ["read", "write", "approve", "delete"],
      paralegal: ["read", "write"],
      client: ["read", "upload_documents"],
      title_company: ["read", "write_title_docs"],
      admin: ["read", "write", "approve", "delete", "manage"]
    },
    realtime_events: [
      "stage_change",
      "document_upload",
      "title_cleared",
      "financing_approved",
      "closing_scheduled"
    ],
    automations: {
      on_contract_signed: ["order_title_search", "schedule_inspection"],
      on_title_cleared: ["request_loan_docs", "schedule_closing"],
      on_closing_complete: ["record_deed", "send_final_docs"]
    },
    sla: {
      contract_to_title: { days: 5, unit: "business_days" },
      title_to_inspection: { days: 10, unit: "calendar_days" },
      financing_to_closing: { days: 30, unit: "calendar_days" }
    }
  },

  corporate: {
    name: "Corporate/Business",
    description: "Entity formation, contracts, compliance",
    stages: [
      "intake",
      "document_prep",
      "review",
      "negotiation",
      "execution",
      "compliance"
    ],
    documents: [
      "articles_of_incorporation",
      "bylaws",
      "operating_agreement",
      "contracts",
      "board_resolutions",
      "compliance_filings"
    ],
    notifications: [
      "filing_deadline",
      "annual_report_due",
      "contract_renewal",
      "compliance_check"
    ],
    permissions: {
      lawyer: ["read", "write", "approve", "delete"],
      paralegal: ["read", "write"],
      client: ["read", "upload_documents", "approve"],
      accountant: ["read", "write_financial_docs"],
      admin: ["read", "write", "approve", "delete", "manage"]
    },
    realtime_events: [
      "stage_change",
      "document_upload",
      "contract_executed",
      "filing_completed",
      "compliance_due"
    ],
    automations: {
      on_intake_complete: ["draft_initial_docs", "send_engagement_letter"],
      on_execution_complete: ["file_with_state", "setup_compliance_calendar"],
      on_annual_report_due: ["notify_client", "prepare_filing"]
    },
    sla: {
      intake_to_document_prep: { days: 3, unit: "business_days" },
      review_to_execution: { days: 14, unit: "calendar_days" }
    }
  }
};

/**
 * Get matter type configuration by key
 */
function getMatterType(typeKey) {
  if (!matterTypes[typeKey]) {
    throw new Error(`Matter type '${typeKey}' not found in registry`);
  }
  return matterTypes[typeKey];
}

/**
 * Get all available matter types
 */
function getAllMatterTypes() {
  return Object.keys(matterTypes).map(key => ({
    key,
    ...matterTypes[key]
  }));
}

/**
 * Validate if a matter type exists
 */
function isValidMatterType(typeKey) {
  return !!matterTypes[typeKey];
}

/**
 * Get stages for a specific matter type
 */
function getStagesForMatterType(typeKey) {
  const matterType = getMatterType(typeKey);
  return matterType.stages;
}

/**
 * Get permissions for a matter type and role
 */
function getPermissions(typeKey, role) {
  const matterType = getMatterType(typeKey);
  return matterType.permissions[role] || [];
}

/**
 * Check if a role has a specific permission
 */
function hasPermission(typeKey, role, permission) {
  const permissions = getPermissions(typeKey, role);
  return permissions.includes(permission);
}

module.exports = {
  matterTypes,
  getMatterType,
  getAllMatterTypes,
  isValidMatterType,
  getStagesForMatterType,
  getPermissions,
  hasPermission
};
