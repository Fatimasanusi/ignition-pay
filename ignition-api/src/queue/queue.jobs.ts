export const EMAIL_JOB_SEND_VERIFICATION = 'send-verification';
export const EMAIL_JOB_SEND_NOTIFICATION = 'send-notification';

export interface SendVerificationEmailPayload {
  to: string;
  token: string;
  userId: string;
}

export interface SendNotificationEmailPayload {
  to: string;
  subject: string;
  body: string;
}

export const CONTRACT_EVENT_JOB_PROCESS = 'process';

export interface ContractEventPayload {
  contractId: string;
  eventType: string;
  txHash?: string;
  ledger?: number;
  data?: Record<string, unknown>;
}

export const ANALYTICS_JOB_TRACK = 'track';

export interface AnalyticsEventPayload {
  event: string;
  userId?: string;
  properties?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Milestone notifications
// ---------------------------------------------------------------------------

export const MILESTONE_JOB_COMPLETED = 'milestone-completed';
export const MILESTONE_JOB_CAMPAIGN_COMPLETED = 'campaign-completed';

export interface MilestoneCompletedPayload {
  /** The campaign creator's user id – recipient of the notification */
  creatorId: string;
  creatorEmail: string;
  campaignId: string;
  campaignTitle: string;
  milestoneId: string;
  milestoneTitle: string;
}

export interface CampaignCompletedPayload {
  creatorId: string;
  creatorEmail: string;
  campaignId: string;
  campaignTitle: string;
}
