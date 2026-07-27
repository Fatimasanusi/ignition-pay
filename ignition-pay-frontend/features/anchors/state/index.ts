'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  Sep24WizardState,
  Sep24Operation,
  AnchorHistoryQuery,
  AnchorHistoryResponse,
  AnchorHistoryItem,
} from '@/features/anchors/models'
import { initiateSep24, pollSep24Status, isSep24Terminal, fetchAnchorHistory } from '@/features/anchors/services'
import { trackEvent } from '@/lib/analytics'

const POLL_INTERVAL_MS = 3000

const INITIAL_STATE: Sep24WizardState = {
  open: false,
  anchorName: '',
  operation: null,
  assetCode: 'USD',
  amount: '',
  step: 'operation',
  transactionId: null,
  anchorTxId: null,
  interactiveUrl: null,
  status: null,
  error: null,
  isSubmitting: false,
}

export function useSep24Wizard() {
  const [state, setState] = useState<Sep24WizardState>(INITIAL_STATE)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => clearPolling()
  }, [clearPolling])

  const open = useCallback(
    (anchorName: string, initialOperation?: Sep24Operation) => {
      setState({
        ...INITIAL_STATE,
        open: true,
        anchorName,
        operation: initialOperation ?? null,
        step: initialOperation ? 'form' : 'operation',
      })
    },
    [],
  )

  const close = useCallback(() => {
    clearPolling()
    setState(INITIAL_STATE)
  }, [clearPolling])

  const setOperation = useCallback((operation: Sep24Operation) => {
    setState((prev) => ({ ...prev, operation, step: 'form' }))
  }, [])

  const setAssetCode = useCallback((assetCode: string) => {
    setState((prev) => ({ ...prev, assetCode }))
  }, [])

  const setAmount = useCallback((amount: string) => {
    setState((prev) => ({ ...prev, amount }))
  }, [])

  const setAssetIssuer = useCallback((issuer?: string) => {
    setState((prev) => ({ ...prev, assetIssuer: issuer }))
  }, [])

  const submit = useCallback(
    async (stellarAccount: string) => {
      if (!state.operation) return

      setState((prev) => ({ ...prev, isSubmitting: true, error: null }))

      const analyticsEvent =
        state.operation === 'deposit'
          ? 'anchor_deposit_started'
          : 'anchor_withdrawal_started'

      trackEvent(analyticsEvent, {
        anchor: state.anchorName,
        asset: state.assetCode,
      })

      try {
        const result = await initiateSep24({
          anchorName: state.anchorName,
          operation: state.operation,
          assetCode: state.assetCode,
          assetIssuer: state.assetIssuer,
          amount: state.amount ? parseFloat(state.amount) : undefined,
          stellarAccount,
        })

        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          step: 'interactive',
          transactionId: result.id,
          anchorTxId: result.anchorTxId,
          interactiveUrl: result.interactiveUrl,
          status: {
            id: result.id,
            anchorTxId: result.anchorTxId,
            status: 'incomplete',
            startedAt: result.startedAt,
          },
        }))

        startPolling(result.id)
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          step: 'error',
          error: err?.message ?? 'Failed to initiate transaction',
        }))
      }
    },
    [state.operation, state.anchorName, state.assetCode, state.assetIssuer, state.amount],
  )

  const startPolling = useCallback(
    (txId: string) => {
      clearPolling()

      const controller = new AbortController()
      abortRef.current = controller

      const poll = async () => {
        try {
          const status = await pollSep24Status(txId, controller.signal)
          setState((prev) => ({
            ...prev,
            status,
            step: isSep24Terminal(status.status) ? 'completed' : 'interactive',
          }))

          if (isSep24Terminal(status.status)) {
            clearPolling()
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') return
        }
      }

      poll()
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    },
    [clearPolling],
  )

  const reset = useCallback(() => {
    clearPolling()
    setState((prev) => ({
      ...prev,
      step: 'form',
      transactionId: null,
      anchorTxId: null,
      interactiveUrl: null,
      status: null,
      error: null,
    }))
  }, [clearPolling])

  return {
    state,
    open,
    close,
    setOperation,
    setAssetCode,
    setAssetIssuer,
    setAmount,
    submit,
    reset,
  }
}

// ---------------------------------------------------------------------------
// Anchor History Hook
// ---------------------------------------------------------------------------

export interface UseAnchorHistoryResult {
  items: AnchorHistoryItem[]
  total: number
  page: number
  limit: number
  isLoading: boolean
  error: string | null
  query: AnchorHistoryQuery
  setQuery: (q: AnchorHistoryQuery) => void
  refresh: () => void
}

export function useAnchorHistory(initialQuery: AnchorHistoryQuery = {}): UseAnchorHistoryResult {
  const [items, setItems] = useState<AnchorHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQueryState] = useState<AnchorHistoryQuery>({
    page: 1,
    limit: 20,
    ...initialQuery,
  })
  const abortRef = useRef<AbortController | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const load = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const result: AnchorHistoryResponse = await fetchAnchorHistory(query, controller.signal)
      if (!controller.signal.aborted) {
        setItems(result.items)
        setTotal(result.total)
        setPage(result.page)
        setLimit(result.limit)
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err?.message ?? 'Failed to load anchor history')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [query, refreshToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
    return () => {
      abortRef.current?.abort()
    }
  }, [load])

  const setQuery = useCallback((q: AnchorHistoryQuery) => {
    setQueryState((prev) => ({ ...prev, ...q }))
  }, [])

  const refresh = useCallback(() => {
    setRefreshToken((t) => t + 1)
  }, [])

  return { items, total, page, limit, isLoading, error, query, setQuery, refresh }
}
