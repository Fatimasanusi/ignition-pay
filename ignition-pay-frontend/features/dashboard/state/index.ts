'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { WalletSnapshot } from '@/features/dashboard/models'
import {
  BALANCE_POLL_INTERVAL_MS,
  demoWalletSnapshot,
  fetchWalletSnapshot,
  isLiveDataConfigured,
  subscribeToWalletStream,
} from '@/features/dashboard/services'
import { ErrorMessage, ErrorCode } from '@/lib/constants'

export type BalanceStatus = 'loading' | 'ready' | 'error'

export interface WalletBalancesState {
  snapshot: WalletSnapshot | null
  status: BalanceStatus
  /** Populated whenever `status` is `error`. */
  error: string | null
  /** True while a background refresh runs over already-rendered data. */
  isRefreshing: boolean
  /** True when balances arrive over a stream rather than by polling. */
  isLive: boolean
  refresh: () => void
}

/**
 * Keeps dashboard balances fresh: loads a snapshot, then subscribes to the
 * backend notification stream when available and falls back to polling
 * `/wallets` otherwise.
 */
export function useWalletBalances(address: string): WalletBalancesState {
  const [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null)
  const [status, setStatus] = useState<BalanceStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const hasSnapshotRef = useRef(false)

  const load = useCallback(async () => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    if (hasSnapshotRef.current) {
      setIsRefreshing(true)
    } else {
      setStatus('loading')
    }

    try {
      const next = isLiveDataConfigured()
        ? await fetchWalletSnapshot(address, controller.signal)
        : demoWalletSnapshot()

      if (controller.signal.aborted) return

      hasSnapshotRef.current = true
      setSnapshot(next)
      setError(null)
      setStatus('ready')
    } catch (cause) {
      if (controller.signal.aborted) return

      setError(cause instanceof Error ? cause.message : ErrorMessage[ErrorCode.GEN_INTERNAL_ERROR])
      setStatus('error')
    } finally {
      if (!controller.signal.aborted) setIsRefreshing(false)
    }
  }, [address])

  useEffect(() => {
    void load()

    const unsubscribe = subscribeToWalletStream(address, {
      onBalanceChange: () => void load(),
      onError: () => setIsLive(false),
    })

    if (unsubscribe) {
      setIsLive(true)
      return () => {
        setIsLive(false)
        unsubscribe()
        requestRef.current?.abort()
      }
    }

    const interval = setInterval(() => void load(), BALANCE_POLL_INTERVAL_MS)
    return () => {
      clearInterval(interval)
      requestRef.current?.abort()
    }
  }, [address, load])

  const refresh = useCallback(() => void load(), [load])

  return { snapshot, status, error, isRefreshing, isLive, refresh }
}
