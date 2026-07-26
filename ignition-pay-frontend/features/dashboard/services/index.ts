import {
  API_BASE_URLS,
  API_ENDPOINTS,
  API_PREFIX,
  ErrorCode,
  ErrorMessage,
  HttpStatusToErrorCode,
  TIMEOUT,
  type ErrorCodeType,
} from '@/lib/constants'
import type { AssetBalance, WalletSnapshot } from '@/features/dashboard/models'

/** How often we re-poll `/wallets` when no realtime stream is available. */
export const BALANCE_POLL_INTERVAL_MS = 15_000

/**
 * Placeholder USD prices. The balance endpoint returns amounts only, so the
 * dashboard values are estimated client-side until a price feed is wired up.
 */
const USD_PRICES: Record<string, number> = {
  XLM: 0.11,
  USDC: 1,
  USDT: 1,
  EURC: 1.08,
  AQUA: 0.25,
}

export class DashboardError extends Error {
  readonly code: ErrorCodeType

  constructor(code: ErrorCodeType, message?: string) {
    super(message ?? ErrorMessage[code] ?? 'Unable to load balances.')
    this.name = 'DashboardError'
    this.code = code
  }
}

function apiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL
  if (configured) return configured.replace(/\/$/, '')

  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  return API_BASE_URLS[environment]
}

function estimateUsdValue(code: string, balance: number): number {
  return balance * (USD_PRICES[code.toUpperCase()] ?? 0)
}

interface RawBalance {
  assetType?: string
  assetCode?: string
  assetIssuer?: string
  balance?: string | number
}

function toAssetBalance(raw: RawBalance): AssetBalance | null {
  const code = raw.assetCode ?? (raw.assetType === 'native' ? 'XLM' : undefined)
  if (!code) return null

  const balance = Number(raw.balance ?? 0)
  if (!Number.isFinite(balance)) return null

  return {
    code,
    issuer: raw.assetType === 'native' ? 'native' : (raw.assetIssuer ?? 'unknown'),
    balance,
    value: estimateUsdValue(code, balance),
  }
}

export function parseWalletSnapshot(address: string, payload: unknown): WalletSnapshot {
  const balances = (payload as { balances?: RawBalance[] } | null)?.balances

  if (!Array.isArray(balances)) {
    throw new DashboardError(ErrorCode.GEN_BAD_REQUEST, 'Unexpected balance response.')
  }

  return {
    address,
    assets: balances.map(toAssetBalance).filter((asset): asset is AssetBalance => asset !== null),
    updatedAt: new Date().toISOString(),
  }
}

/** Fetches the current balances for `address`, mapped into a dashboard snapshot. */
export async function fetchWalletSnapshot(
  address: string,
  signal?: AbortSignal,
): Promise<WalletSnapshot> {
  const url = `${apiBaseUrl()}${API_PREFIX}${API_ENDPOINTS.wallets.balance(address)}`
  const timeout = AbortSignal.timeout(TIMEOUT.default)
  const composed = signal ? AbortSignal.any([signal, timeout]) : timeout

  let response: Response
  try {
    response = await fetch(url, {
      signal: composed,
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new DashboardError(ErrorCode.GEN_NETWORK_ERROR)
  }

  if (!response.ok) {
    throw new DashboardError(
      HttpStatusToErrorCode[response.status] ?? ErrorCode.GEN_INTERNAL_ERROR,
    )
  }

  return parseWalletSnapshot(address, await response.json())
}

/** True once a backend is configured; otherwise the dashboard runs on demo data. */
export function isLiveDataConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_BASE_URL)
}

export const DEMO_WALLET_ADDRESS = 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5K2NQXJ6K4VJKTQVJVQVJVQVJVQ'

/** Stand-in snapshot used until the wallet API is wired to the dashboard. */
export function demoWalletSnapshot(): WalletSnapshot {
  return {
    address: DEMO_WALLET_ADDRESS,
    updatedAt: new Date().toISOString(),
    assets: [
      {
        code: 'XLM',
        issuer: 'native',
        balance: 5234.5,
        value: 575.8,
        change24h: 5.2,
        history: [531.2, 540.8, 522.4, 556.1, 549.7, 568.3, 575.8],
      },
      {
        code: 'USDC',
        issuer: 'GBBD47UZQ5ODSQIRQ73RQ5NBAYKU5NK2HRE3ENDQMAIL7UCHQVCD2Z4A',
        balance: 2150.75,
        value: 2150.75,
        change24h: 0,
        history: [2150.75, 2150.75, 2150.75, 2150.75, 2150.75, 2150.75, 2150.75],
      },
      {
        code: 'AQUA',
        issuer: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTGKCYEG5MFWQVMBNXA5W2HAT',
        balance: 125.3,
        value: 31.33,
        change24h: -2.1,
        history: [34.1, 33.6, 33.9, 32.4, 32.8, 31.9, 31.33],
      },
    ],
  }
}

export interface WalletStreamHandlers {
  onBalanceChange: () => void
  onError?: () => void
}

/**
 * Subscribes to the backend notification stream so balances update without a
 * reload. Returns `null` when no stream is configured or `EventSource` is
 * unavailable, in which case the caller should fall back to polling.
 */
export function subscribeToWalletStream(
  address: string,
  handlers: WalletStreamHandlers,
): (() => void) | null {
  const streamUrl = process.env.NEXT_PUBLIC_WALLET_STREAM_URL
  if (!streamUrl || typeof EventSource === 'undefined') return null

  const source = new EventSource(`${streamUrl}?address=${encodeURIComponent(address)}`)

  const handleMessage = () => handlers.onBalanceChange()
  const handleError = () => handlers.onError?.()

  source.addEventListener('balance', handleMessage)
  source.addEventListener('payment', handleMessage)
  source.addEventListener('error', handleError)

  return () => {
    source.removeEventListener('balance', handleMessage)
    source.removeEventListener('payment', handleMessage)
    source.removeEventListener('error', handleError)
    source.close()
  }
}
