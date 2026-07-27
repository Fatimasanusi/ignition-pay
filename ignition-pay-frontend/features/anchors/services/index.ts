import {
  API_BASE_URLS,
  API_ENDPOINTS,
  API_PREFIX,
  TIMEOUT,
} from '@/lib/constants'
import type {
  Sep24InitiateRequest,
  Sep24InitiateResponse,
  Sep24TransactionStatus,
} from '@/features/anchors/models'

function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL
  if (configured) return configured.replace(/\/$/, '')

  const environment =
    process.env.NODE_ENV === 'production' ? 'production' : 'development'
  return API_BASE_URLS[environment]
}

export async function initiateSep24(
  req: Sep24InitiateRequest,
  signal?: AbortSignal,
): Promise<Sep24InitiateResponse> {
  const url = `${apiBaseUrl()}${API_PREFIX}/sep24/initiate`
  const timeout = AbortSignal.timeout(TIMEOUT.default)
  const composed = signal ? AbortSignal.any([signal, timeout]) : timeout

  const response = await fetch(url, {
    method: 'POST',
    signal: composed,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to initiate SEP-24 flow: ${errorBody}`)
  }

  return response.json()
}

export async function pollSep24Status(
  id: string,
  signal?: AbortSignal,
): Promise<Sep24TransactionStatus> {
  const url = `${apiBaseUrl()}${API_PREFIX}/sep24/status`
  const timeout = AbortSignal.timeout(TIMEOUT.default)
  const composed = signal ? AbortSignal.any([signal, timeout]) : timeout

  const response = await fetch(url, {
    method: 'POST',
    signal: composed,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error')
    throw new Error(`Failed to get SEP-24 status: ${errorBody}`)
  }

  return response.json()
}

export const SEP24_STATUS_LABELS: Record<string, string> = {
  incomplete: 'Awaiting action',
  pending_user_transfer_start: 'Waiting for transfer',
  pending_external: 'Processing externally',
  pending_anchor: 'Anchor is processing',
  pending_stellar: 'Submitting to Stellar',
  pending_trust: 'Waiting for trustline',
  pending_user: 'Awaiting user action',
  completed: 'Completed',
  no_market: 'No market available',
  too_small: 'Amount too small',
  too_large: 'Amount too large',
  expired: 'Transaction expired',
  error: 'Error',
}

export const SEP24_STATUS_VARIANTS: Record<string, string> = {
  incomplete: 'default',
  pending_user_transfer_start: 'warning',
  pending_external: 'warning',
  pending_anchor: 'warning',
  pending_stellar: 'warning',
  pending_trust: 'warning',
  pending_user: 'warning',
  completed: 'success',
  no_market: 'destructive',
  too_small: 'destructive',
  too_large: 'destructive',
  expired: 'destructive',
  error: 'destructive',
}

export function isSep24Terminal(status: string): boolean {
  return ['completed', 'no_market', 'too_small', 'too_large', 'expired', 'error'].includes(status)
}
