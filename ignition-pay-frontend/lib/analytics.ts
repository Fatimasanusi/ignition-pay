'use client';

import { track } from '@vercel/analytics';

export type EventName =
  | 'page_view'
  | 'wallet_connect'
  | 'wallet_disconnect'
  | 'send_initiated'
  | 'send_confirmed'
  | 'send_failed'
  | 'receive_viewed'
  | 'anchor_deposit_started'
  | 'anchor_withdrawal_started'
  | 'settings_updated'
  | string;

/**
 * Track a user event. No-ops outside the browser or when analytics is
 * not available (e.g. development without the Vercel environment).
 */
export function trackEvent(
  name: EventName,
  properties?: Record<string, string | number | boolean | null>,
): void {
  try {
    track(name, properties);
  } catch {
    // swallow — analytics must never break the app
  }
}
