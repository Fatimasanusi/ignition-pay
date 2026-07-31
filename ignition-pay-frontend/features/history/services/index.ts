/**
 * Data fetching services for transaction history.
 * Uses direct fetch() API with AbortSignal (as found in Part 1 codebase).
 */

import type { Transaction } from '../models'

/**
 * Fetches transactions from the backend API.
 * Uses cursor-based pagination for efficiency.
 *
 * @param cursor Optional pagination cursor (ID of last item from previous page)
 * @param limit Number of items per page (default: 10, max: 100)
 * @param signal AbortSignal for cleanup
 * @returns Paginated transaction response
 */
export async function fetchTransactions(
  {
    cursor,
    limit = 10,
    status,
    asset,
  }: {
    cursor?: string | null
    limit?: number
    status?: string
    asset?: string
  } = {},
  signal?: AbortSignal,
): Promise<{
  data: Transaction[]
  nextCursor: string | null
  hasNextPage: boolean
  limit: number
}> {
  // Build query parameters
  const searchParams = new URLSearchParams()
  if (cursor) searchParams.append('cursor', cursor)
  if (limit) searchParams.append('limit', String(limit))
  if (status) searchParams.append('status', status)
  if (asset) searchParams.append('asset', asset)

  const url = new URL('/api/v1/transactions', window.location.origin)
  url.search = searchParams.toString()

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch transactions: ${response.statusText}`)
  }

  const data = await response.json()

  // Transform backend timestamps to Date objects
  return {
    ...data,
    data: data.data.map((tx: any) => ({
      ...tx,
      timestamp: new Date(tx.createdAt || tx.timestamp),
    })),
  }
}
