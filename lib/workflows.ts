import type { BudgetStatus, DisbursementStatus, ObligationStatus, OrdinanceStatus, ProjectStatus, ResolutionStatus } from "@/types"
import type { Capability } from "@/lib/permissions"

/**
 * Declarative approval workflows. ApprovalTimeline renders `steps`;
 * WorkflowActions renders the `transitions` allowed from the current status
 * for the current user's capabilities. Modules never hardcode their own flow UI.
 */

export interface WorkflowStep<S extends string> {
  status: S
  label: string
}

export interface WorkflowField {
  name: string
  label: string
  placeholder?: string
  required?: boolean
}

export interface WorkflowTransition<S extends string> {
  from: S[]
  to: S
  label: string
  description: string
  capability: Capability
  destructive?: boolean
  requiresRemarks?: boolean
  /** Extra inputs captured in the confirmation dialog (e.g. check number). */
  fields?: WorkflowField[]
}

export interface WorkflowDefinition<S extends string> {
  name: string
  steps: WorkflowStep<S>[]
  /** Statuses that end the flow off the happy path (cancelled, rejected…). */
  terminal: S[]
  transitions: WorkflowTransition<S>[]
}

export function transitionsFrom<S extends string>(def: WorkflowDefinition<S>, status: S, can: (c: Capability) => boolean) {
  return def.transitions.filter((t) => t.from.includes(status) && can(t.capability))
}

export const BUDGET_WORKFLOW: WorkflowDefinition<BudgetStatus> = {
  name: "Annual budget",
  steps: [
    { status: "Draft", label: "Prepared" },
    { status: "For Review", label: "Committee review" },
    { status: "For Authorization", label: "Sanggunian authorization" },
    { status: "Approved", label: "Approved" },
    { status: "Active", label: "Active" },
    { status: "Closed", label: "Closed" },
  ],
  terminal: [],
  transitions: [
    {
      from: ["Draft"],
      to: "For Review",
      label: "Submit for review",
      description: "Send the proposed budget to the Committee on Appropriations.",
      capability: "finance",
    },
    {
      from: ["For Review"],
      to: "For Authorization",
      label: "Endorse for authorization",
      description: "Endorse the budget to the Sangguniang Barangay for enactment.",
      capability: "finance",
    },
    {
      from: ["For Review", "For Authorization"],
      to: "Draft",
      label: "Return to draft",
      description: "Return the budget for revision.",
      capability: "financeApprove",
      requiresRemarks: true,
      destructive: true,
    },
    {
      from: ["For Authorization"],
      to: "Approved",
      label: "Approve budget",
      description: "Record enactment through the appropriation ordinance.",
      capability: "financeApprove",
    },
    { from: ["Approved"], to: "Active", label: "Activate", description: "Make this the operating budget of the fiscal year.", capability: "finance" },
    {
      from: ["Active"],
      to: "Closed",
      label: "Close fiscal year",
      description: "Close the budget; no further obligations can be charged.",
      capability: "finance",
      requiresRemarks: true,
    },
  ],
}

export const OBLIGATION_WORKFLOW: WorkflowDefinition<ObligationStatus> = {
  name: "Obligation",
  steps: [
    { status: "Draft", label: "Prepared" },
    { status: "For Review", label: "Budget certified" },
    { status: "Approved", label: "Approved" },
    { status: "Partially Disbursed", label: "Partially disbursed" },
    { status: "Fully Disbursed", label: "Fully disbursed" },
  ],
  terminal: ["Cancelled"],
  transitions: [
    {
      from: ["Draft"],
      to: "For Review",
      label: "Submit for review",
      description: "Certify budget availability and submit for approval.",
      capability: "finance",
    },
    {
      from: ["For Review"],
      to: "Approved",
      label: "Approve obligation",
      description: "Approving commits the amount against the PPA's available balance.",
      capability: "financeApprove",
    },
    {
      from: ["For Review"],
      to: "Draft",
      label: "Return",
      description: "Return to the requester for corrections.",
      capability: "financeApprove",
      requiresRemarks: true,
      destructive: true,
    },
    {
      from: ["Draft", "For Review", "Approved"],
      to: "Cancelled",
      label: "Cancel",
      description: "Cancel the obligation and release the committed amount.",
      capability: "finance",
      requiresRemarks: true,
      destructive: true,
    },
  ],
}

export const DISBURSEMENT_WORKFLOW: WorkflowDefinition<DisbursementStatus> = {
  name: "Disbursement",
  steps: [
    { status: "Draft", label: "Prepared" },
    { status: "For Review", label: "Submitted for review" },
    { status: "For Approval", label: "Reviewed" },
    { status: "Approved", label: "Approved" },
    { status: "Released", label: "Released" },
  ],
  terminal: ["Cancelled"],
  transitions: [
    {
      from: ["Draft"],
      to: "For Review",
      label: "Submit for review",
      description: "Submit the voucher and supporting documents for review.",
      capability: "finance",
    },
    { from: ["For Review"], to: "For Approval", label: "Mark reviewed", description: "Documents are complete and amounts verified.", capability: "finance" },
    { from: ["For Approval"], to: "Approved", label: "Approve disbursement", description: "Authorize payment of this voucher.", capability: "financeApprove" },
    {
      from: ["For Review", "For Approval"],
      to: "Draft",
      label: "Return",
      description: "Return the voucher for corrections.",
      capability: "financeApprove",
      requiresRemarks: true,
      destructive: true,
    },
    {
      from: ["Approved"],
      to: "Released",
      label: "Release payment",
      description: "Record the payment. An expense entry is created automatically.",
      capability: "finance",
      fields: [{ name: "referenceNumber", label: "Check / reference number", placeholder: "e.g. LBP Check No. 0012401", required: true }],
    },
    {
      from: ["Draft", "For Review", "For Approval", "Approved"],
      to: "Cancelled",
      label: "Cancel",
      description: "Cancel this voucher.",
      capability: "finance",
      requiresRemarks: true,
      destructive: true,
    },
  ],
}

export const PROJECT_WORKFLOW: WorkflowDefinition<ProjectStatus> = {
  name: "Project",
  steps: [
    { status: "Planning", label: "Planning" },
    { status: "Approved", label: "Approved" },
    { status: "Procurement", label: "Procurement" },
    { status: "Ongoing", label: "Implementation" },
    { status: "Completed", label: "Completed" },
  ],
  terminal: ["Cancelled"],
  transitions: [
    { from: ["Planning"], to: "Approved", label: "Approve project", description: "Approve implementation under the linked PPA.", capability: "financeApprove" },
    {
      from: ["Approved"],
      to: "Procurement",
      label: "Start procurement",
      description: "Begin canvass / procurement of works and materials.",
      capability: "operations",
    },
    { from: ["Procurement"], to: "Ongoing", label: "Start implementation", description: "Contractor has mobilized.", capability: "operations" },
    {
      from: ["Ongoing"],
      to: "Delayed",
      label: "Flag as delayed",
      description: "Record a delay and its cause.",
      capability: "operations",
      requiresRemarks: true,
      destructive: true,
    },
    { from: ["Delayed"], to: "Ongoing", label: "Resume", description: "Implementation is back on schedule.", capability: "operations" },
    { from: ["Ongoing", "Delayed"], to: "Completed", label: "Mark completed", description: "Works are complete and accepted.", capability: "operations" },
    {
      from: ["Planning", "Approved", "Procurement"],
      to: "Cancelled",
      label: "Cancel project",
      description: "Cancel the project.",
      capability: "financeApprove",
      requiresRemarks: true,
      destructive: true,
    },
  ],
}

export const ORDINANCE_WORKFLOW: WorkflowDefinition<OrdinanceStatus> = {
  name: "Ordinance",
  steps: [
    { status: "Draft", label: "Drafted" },
    { status: "Under Review", label: "Committee review" },
    { status: "Approved", label: "Approved on third reading" },
    { status: "Effective", label: "Effective" },
  ],
  terminal: ["Repealed", "Archived"],
  transitions: [
    {
      from: ["Draft"],
      to: "Under Review",
      label: "Refer to committee",
      description: "Calendar the measure and refer it to committee.",
      capability: "governance",
    },
    { from: ["Under Review"], to: "Approved", label: "Record approval", description: "Record approval on third and final reading.", capability: "approve" },
    {
      from: ["Under Review"],
      to: "Draft",
      label: "Return to author",
      description: "Return for revision.",
      capability: "governance",
      requiresRemarks: true,
      destructive: true,
    },
    {
      from: ["Approved"],
      to: "Effective",
      label: "Mark effective",
      description: "Posted/published and in effect.",
      capability: "governance",
      fields: [{ name: "effectiveDate", label: "Effective date (yyyy-mm-dd)", placeholder: "2026-10-15", required: true }],
    },
    {
      from: ["Effective"],
      to: "Repealed",
      label: "Repeal",
      description: "Record repeal by a later ordinance.",
      capability: "approve",
      requiresRemarks: true,
      destructive: true,
    },
    {
      from: ["Draft", "Approved", "Effective", "Repealed"],
      to: "Archived",
      label: "Archive",
      description: "Move to archived records.",
      capability: "governance",
      destructive: true,
    },
  ],
}

export const RESOLUTION_WORKFLOW: WorkflowDefinition<ResolutionStatus> = {
  name: "Resolution",
  steps: [
    { status: "Draft", label: "Drafted" },
    { status: "Proposed", label: "Proposed" },
    { status: "Approved", label: "Approved" },
  ],
  terminal: ["Rejected", "Archived"],
  transitions: [
    { from: ["Draft"], to: "Proposed", label: "Propose", description: "Include in the order of business.", capability: "governance" },
    { from: ["Proposed"], to: "Approved", label: "Record approval", description: "Record approval by the Sangguniang Barangay.", capability: "approve" },
    {
      from: ["Proposed"],
      to: "Rejected",
      label: "Record rejection",
      description: "The motion to approve was lost.",
      capability: "approve",
      requiresRemarks: true,
      destructive: true,
    },
    {
      from: ["Draft", "Approved", "Rejected"],
      to: "Archived",
      label: "Archive",
      description: "Move to archived records.",
      capability: "governance",
      destructive: true,
    },
  ],
}
