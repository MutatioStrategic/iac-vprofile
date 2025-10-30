/**
 * Insolvency Pipeline Configuration
 * Declarative pipeline config for insolvency/bankruptcy cases
 */

import type { PipelineConfig } from '@/types/pipeline.types';

export const insolvencyPipelineConfig: PipelineConfig = {
  key: 'insolvency',
  name: 'Insolvency & Bankruptcy',
  version: '1.0.0',
  description: 'Pipeline for managing insolvency and bankruptcy cases',

  // ===== STAGES =====
  stages: [
    {
      key: 'intake',
      name: 'Intake & Assessment',
      description: 'Initial client consultation and financial assessment',
      color: '#3B82F6',
      icon: 'inbox',
      estimatedDuration: { value: 3, unit: 'days' }
    },
    {
      key: 'document_collection',
      name: 'Document Collection',
      description: 'Gather financial documents and statements',
      color: '#8B5CF6',
      icon: 'folder',
      estimatedDuration: { value: 7, unit: 'days' }
    },
    {
      key: 'means_test',
      name: 'Means Test',
      description: 'Calculate means test to determine Chapter 7 vs 13 eligibility',
      color: '#10B981',
      icon: 'calculator',
      estimatedDuration: { value: 2, unit: 'days' }
    },
    {
      key: 'filing_preparation',
      name: 'Filing Preparation',
      description: 'Prepare bankruptcy petition and schedules',
      color: '#F59E0B',
      icon: 'file-text',
      estimatedDuration: { value: 5, unit: 'days' }
    },
    {
      key: 'filed',
      name: 'Filed',
      description: 'Petition filed with bankruptcy court',
      color: '#EF4444',
      icon: 'check-circle',
      estimatedDuration: { value: 1, unit: 'days' }
    },
    {
      key: 'meeting_of_creditors',
      name: 'Meeting of Creditors (341)',
      description: 'Attend 341 meeting with trustee',
      color: '#6366F1',
      icon: 'users',
      estimatedDuration: { value: 30, unit: 'days' }
    },
    {
      key: 'pending_discharge',
      name: 'Pending Discharge',
      description: 'Waiting for discharge order',
      color: '#EC4899',
      icon: 'clock',
      estimatedDuration: { value: 60, unit: 'days' }
    },
    {
      key: 'discharged',
      name: 'Discharged',
      description: 'Discharge order received',
      color: '#22C55E',
      icon: 'check-square',
      estimatedDuration: { value: 1, unit: 'days' }
    },
    {
      key: 'closed',
      name: 'Closed',
      description: 'Case closed',
      color: '#6B7280',
      icon: 'archive'
    }
  ],

  // ===== TRANSITIONS =====
  transitions: [
    {
      from: 'intake',
      to: 'document_collection',
      label: 'Start Document Collection',
      requiredFields: ['client_name', 'contact_info', 'bankruptcy_type'],
      conditions: [
        {
          type: 'field_required',
          field: 'retainer_signed',
          message: 'Retainer agreement must be signed'
        }
      ]
    },
    {
      from: 'document_collection',
      to: 'means_test',
      label: 'Proceed to Means Test',
      requiredFields: [
        'income_documents',
        'expense_documents',
        'asset_list',
        'debt_list'
      ],
      conditions: [
        {
          type: 'field_required',
          field: 'documents_complete',
          message: 'All required documents must be collected'
        }
      ]
    },
    {
      from: 'means_test',
      to: 'filing_preparation',
      label: 'Prepare Filing',
      requiredFields: ['means_test_result', 'chapter_determination'],
      conditions: [
        {
          type: 'field_required',
          field: 'means_test_approved',
          message: 'Means test must be completed and approved'
        }
      ]
    },
    {
      from: 'filing_preparation',
      to: 'filed',
      label: 'File Petition',
      requiredFields: [
        'petition_complete',
        'schedules_complete',
        'filing_fee_paid'
      ],
      requiresApproval: true,
      conditions: [
        {
          type: 'role_required',
          roles: ['lawyer', 'admin'],
          message: 'Only lawyers can file petitions'
        }
      ]
    },
    {
      from: 'filed',
      to: 'meeting_of_creditors',
      label: 'Schedule 341 Meeting',
      requiredFields: ['case_number', 'filing_date', 'meeting_date']
    },
    {
      from: 'meeting_of_creditors',
      to: 'pending_discharge',
      label: 'Meeting Complete',
      requiredFields: ['meeting_completed', 'trustee_report'],
      conditions: [
        {
          type: 'field_required',
          field: 'meeting_attended',
          message: 'Client must have attended 341 meeting'
        }
      ]
    },
    {
      from: 'pending_discharge',
      to: 'discharged',
      label: 'Discharge Granted',
      requiredFields: ['discharge_order_date', 'discharge_order_received']
    },
    {
      from: 'discharged',
      to: 'closed',
      label: 'Close Case',
      requiredFields: ['final_report', 'client_notified'],
      conditions: [
        {
          type: 'role_required',
          roles: ['lawyer', 'admin'],
          message: 'Only lawyers can close cases'
        }
      ]
    },
    // Allow backwards transitions for corrections
    {
      from: 'document_collection',
      to: 'intake',
      label: 'Return to Intake',
      conditions: [
        {
          type: 'role_required',
          roles: ['lawyer', 'admin'],
          message: 'Requires lawyer approval'
        }
      ]
    },
    {
      from: 'means_test',
      to: 'document_collection',
      label: 'Request Additional Documents'
    }
  ],

  // ===== FIELD DEFINITIONS =====
  fieldDefinitions: [
    // Client Information (all stages)
    {
      key: 'client_name',
      label: 'Client Name',
      type: 'text',
      stages: ['*'],
      validation: { required: true },
      group: 'client_info',
      order: 1
    },
    {
      key: 'contact_info',
      label: 'Contact Information',
      type: 'text',
      stages: ['*'],
      validation: { required: true },
      group: 'client_info',
      order: 2
    },
    {
      key: 'bankruptcy_type',
      label: 'Bankruptcy Chapter',
      type: 'select',
      stages: ['intake', 'document_collection', 'means_test'],
      editableInStages: ['intake', 'means_test'],
      validation: {
        required: true,
        options: [
          { value: 'chapter_7', label: 'Chapter 7 - Liquidation' },
          { value: 'chapter_13', label: 'Chapter 13 - Reorganization' },
          { value: 'chapter_11', label: 'Chapter 11 - Business' }
        ]
      },
      group: 'case_details',
      order: 3
    },

    // Intake Stage
    {
      key: 'retainer_signed',
      label: 'Retainer Agreement Signed',
      type: 'boolean',
      stages: ['intake'],
      validation: { required: true },
      group: 'intake',
      order: 10
    },
    {
      key: 'initial_consultation_date',
      label: 'Initial Consultation Date',
      type: 'date',
      stages: ['intake'],
      group: 'intake',
      order: 11
    },

    // Document Collection Stage
    {
      key: 'income_documents',
      label: 'Income Documents',
      type: 'file',
      stages: ['document_collection', 'means_test'],
      validation: { required: true },
      group: 'documents',
      order: 20
    },
    {
      key: 'expense_documents',
      label: 'Expense Documents',
      type: 'file',
      stages: ['document_collection', 'means_test'],
      validation: { required: true },
      group: 'documents',
      order: 21
    },
    {
      key: 'asset_list',
      label: 'Asset List',
      type: 'file',
      stages: ['document_collection', 'means_test'],
      validation: { required: true },
      group: 'documents',
      order: 22
    },
    {
      key: 'debt_list',
      label: 'Debt List',
      type: 'file',
      stages: ['document_collection', 'means_test'],
      validation: { required: true },
      group: 'documents',
      order: 23
    },
    {
      key: 'documents_complete',
      label: 'All Documents Collected',
      type: 'boolean',
      stages: ['document_collection'],
      group: 'documents',
      order: 24
    },

    // Means Test Stage
    {
      key: 'monthly_income',
      label: 'Current Monthly Income',
      type: 'currency',
      stages: ['means_test', 'filing_preparation'],
      validation: { required: true, min: 0 },
      group: 'means_test',
      order: 30
    },
    {
      key: 'median_income',
      label: 'State Median Income',
      type: 'currency',
      stages: ['means_test'],
      readOnly: true,
      group: 'means_test',
      order: 31
    },
    {
      key: 'means_test_result',
      label: 'Means Test Result',
      type: 'select',
      stages: ['means_test', 'filing_preparation'],
      validation: {
        required: true,
        options: [
          { value: 'chapter_7_eligible', label: 'Chapter 7 Eligible' },
          { value: 'chapter_13_required', label: 'Chapter 13 Required' },
          { value: 'presumption_abuse', label: 'Presumption of Abuse' }
        ]
      },
      group: 'means_test',
      order: 32
    },
    {
      key: 'chapter_determination',
      label: 'Final Chapter Determination',
      type: 'select',
      stages: ['means_test', 'filing_preparation'],
      validation: {
        required: true,
        options: [
          { value: 'chapter_7', label: 'Chapter 7' },
          { value: 'chapter_13', label: 'Chapter 13' }
        ]
      },
      group: 'means_test',
      order: 33
    },

    // Filing Preparation Stage
    {
      key: 'petition_complete',
      label: 'Petition Complete',
      type: 'boolean',
      stages: ['filing_preparation'],
      validation: { required: true },
      group: 'filing',
      order: 40
    },
    {
      key: 'schedules_complete',
      label: 'Schedules Complete',
      type: 'boolean',
      stages: ['filing_preparation'],
      validation: { required: true },
      group: 'filing',
      order: 41
    },
    {
      key: 'filing_fee_paid',
      label: 'Filing Fee Paid',
      type: 'boolean',
      stages: ['filing_preparation', 'filed'],
      validation: { required: true },
      group: 'filing',
      order: 42
    },

    // Filed Stage and Beyond
    {
      key: 'case_number',
      label: 'Bankruptcy Case Number',
      type: 'text',
      stages: ['filed', 'meeting_of_creditors', 'pending_discharge', 'discharged'],
      validation: { required: true },
      editableInStages: ['filed'],
      group: 'court_info',
      order: 50
    },
    {
      key: 'filing_date',
      label: 'Filing Date',
      type: 'date',
      stages: ['filed', 'meeting_of_creditors', 'pending_discharge', 'discharged'],
      validation: { required: true },
      editableInStages: ['filed'],
      group: 'court_info',
      order: 51
    },
    {
      key: 'trustee_name',
      label: 'Trustee Name',
      type: 'text',
      stages: ['filed', 'meeting_of_creditors', 'pending_discharge'],
      group: 'court_info',
      order: 52
    },

    // Meeting of Creditors
    {
      key: 'meeting_date',
      label: '341 Meeting Date',
      type: 'datetime',
      stages: ['filed', 'meeting_of_creditors'],
      validation: { required: true },
      group: 'meeting',
      order: 60
    },
    {
      key: 'meeting_attended',
      label: 'Meeting Attended',
      type: 'boolean',
      stages: ['meeting_of_creditors'],
      validation: { required: true },
      group: 'meeting',
      order: 61
    },
    {
      key: 'meeting_completed',
      label: 'Meeting Completed',
      type: 'boolean',
      stages: ['meeting_of_creditors'],
      validation: { required: true },
      group: 'meeting',
      order: 62
    },
    {
      key: 'trustee_report',
      label: 'Trustee Report',
      type: 'file',
      stages: ['meeting_of_creditors', 'pending_discharge'],
      group: 'meeting',
      order: 63
    },

    // Discharge
    {
      key: 'discharge_order_date',
      label: 'Discharge Order Date',
      type: 'date',
      stages: ['pending_discharge', 'discharged'],
      validation: { required: true },
      editableInStages: ['pending_discharge'],
      group: 'discharge',
      order: 70
    },
    {
      key: 'discharge_order_received',
      label: 'Discharge Order Received',
      type: 'boolean',
      stages: ['pending_discharge', 'discharged'],
      validation: { required: true },
      group: 'discharge',
      order: 71
    },

    // Closing
    {
      key: 'final_report',
      label: 'Final Report',
      type: 'file',
      stages: ['discharged', 'closed'],
      validation: { required: true },
      editableInStages: ['discharged'],
      group: 'closing',
      order: 80
    },
    {
      key: 'client_notified',
      label: 'Client Notified of Closure',
      type: 'boolean',
      stages: ['discharged', 'closed'],
      validation: { required: true },
      group: 'closing',
      order: 81
    }
  ],

  // ===== ROLE PERMISSIONS =====
  rolePermissions: [
    {
      role: 'admin',
      canEdit: true,
      canDelete: true,
      canApprove: true,
      canAssign: true,
      canTransitionFrom: ['*'], // Can transition from any stage
      editableFields: ['*'], // Can edit all fields
      visibleFields: ['*']
    },
    {
      role: 'lawyer',
      canEdit: true,
      canDelete: false,
      canApprove: true,
      canAssign: true,
      canTransitionFrom: [
        'intake',
        'document_collection',
        'means_test',
        'filing_preparation',
        'filed',
        'meeting_of_creditors',
        'pending_discharge',
        'discharged'
      ],
      editableFields: ['*'],
      visibleFields: ['*']
    },
    {
      role: 'paralegal',
      canEdit: true,
      canDelete: false,
      canApprove: false,
      canAssign: false,
      canTransitionFrom: [
        'intake',
        'document_collection',
        'means_test'
      ],
      editableFields: [
        'client_name',
        'contact_info',
        'income_documents',
        'expense_documents',
        'asset_list',
        'debt_list',
        'documents_complete',
        'monthly_income',
        'meeting_date'
      ],
      visibleFields: ['*']
    },
    {
      role: 'client',
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canAssign: false,
      canTransitionFrom: [],
      editableFields: [],
      visibleFields: [
        'client_name',
        'contact_info',
        'bankruptcy_type',
        'case_number',
        'filing_date',
        'meeting_date',
        'discharge_order_date'
      ]
    }
  ],

  // ===== AUTOMATIONS =====
  automations: [
    {
      trigger: 'stage_enter',
      stage: 'filed',
      handler: 'sendFilingNotification',
      config: {
        recipients: ['client', 'assigned_lawyer'],
        template: 'bankruptcy_filed'
      }
    },
    {
      trigger: 'stage_enter',
      stage: 'meeting_of_creditors',
      handler: 'schedule341Reminder',
      config: {
        reminderDays: [7, 3, 1]
      }
    },
    {
      trigger: 'stage_enter',
      stage: 'discharged',
      handler: 'sendDischargeNotification',
      config: {
        recipients: ['client', 'assigned_lawyer'],
        template: 'discharge_granted'
      }
    }
  ],

  // ===== NOTIFICATIONS =====
  notifications: [
    {
      event: 'stage_change',
      recipients: ['assigned_lawyer'],
      template: 'stage_change_notification',
      channels: ['email', 'in_app']
    },
    {
      event: 'deadline_approaching',
      recipients: ['assigned_lawyer', 'client'],
      template: 'deadline_reminder',
      channels: ['email', 'sms']
    },
    {
      event: 'assignment',
      recipients: ['assigned_lawyer'],
      template: 'case_assigned',
      channels: ['email', 'in_app']
    }
  ],

  metadata: {
    category: 'bankruptcy',
    jurisdiction: 'federal',
    averageDuration: '120 days',
    requiredCertifications: ['bankruptcy_specialist']
  }
};
