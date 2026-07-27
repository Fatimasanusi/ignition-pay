export type Sep24Operation = 'deposit' | 'withdraw'

export type Sep24TransactionStatus =
  | 'incomplete'
  | 'pending_user_transfer_start'
  | 'pending_external'
  | 'pending_anchor'
  | 'pending_stellar'
  | 'pending_trust'
  | 'pending_user'
  | 'completed'
  | 'no_market'
  | 'too_small'
  | 'too_large'
  | 'expired'
  | 'error'

export interface InteractiveAnchorInfo {
  name: string
  domain: string
}

export interface Sep24InitiateRequest {
  anchorName: string
  operation: Sep24Operation
  assetCode: string
  assetIssuer?: string
  amount?: number
  stellarAccount: string
}

export interface Sep24InitiateResponse {
  id: string
  anchorTxId: string
  interactiveUrl: string
  status: string
  statusDesc?: string
  moreInfoUrl?: string
  startedAt: string
}

export interface Sep24TransactionStatus {
  id: string
  anchorTxId: string
  status: Sep24TransactionStatus
  statusDesc?: string
  moreInfoUrl?: string
  stellarTxHash?: string
  externalTxId?: string
  message?: string
  amountIn?: string
  amountOut?: string
  feeDetails?: Record<string, unknown>
  startedAt: string
  completedAt?: string
}

export type Sep24WizardStep =
  | 'operation'
  | 'form'
  | 'interactive'
  | 'tracking'
  | 'completed'
  | 'error'

export interface Sep24WizardState {
  open: boolean
  anchorName: string
  operation: Sep24Operation | null
  assetCode: string
  assetIssuer?: string
  amount: string
  step: Sep24WizardStep
  transactionId: string | null
  anchorTxId: string | null
  interactiveUrl: string | null
  status: Sep24TransactionStatus | null
  error: string | null
  isSubmitting: boolean
}
