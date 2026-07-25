'use client'

import { track } from '@vercel/analytics'
import { getStoredConsent } from './consent'

// ---------------------------------------------------------------------------
// Typed event taxonomy
// ---------------------------------------------------------------------------

export interface AnalyticsEventMap {
  page_view: { path: string }
  wallet_connect: { wallet_type: string }
  wallet_disconnect: { wallet_type: string }
  send_initiated: { asset: string; amount: number }
  send_confirmed: { asset: string; amount: number; destination: string }
  send_failed: { asset: string; amount: number; error: string }
  receive_viewed: { asset: string }
  anchor_deposit_started: { anchor: string; asset: string }
  anchor_withdrawal_started: { anchor: string; asset: string }
  settings_updated: { setting: string; value: string }
}

export type EventName = keyof AnalyticsEventMap

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

/**
 * Track a typed analytics event. No-ops when:
 * - running outside the browser
 * - analytics is unavailable (e.g. dev without Vercel environment)
 * - the user has not consented to analytics tracking
 */
export function trackEvent<K extends EventName>(
  name: K,
  properties?: AnalyticsEventMap[K],
): void {
  if (!getStoredConsent()) return
  try {
    track(name, properties as Record<string, string | number | boolean | null>)
  } catch {
    // swallow — analytics must never break the app
  }
}
