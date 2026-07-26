'use client'

import { Copy, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { MASKED_AMOUNT } from '@/hooks/use-hide-balances'

interface WalletCardProps {
  address: string
  xlmBalance: number
  usdcBalance: number
  /** When true, amounts are masked for privacy. */
  hideAmounts?: boolean
  /** Flips the shared privacy preference; the eye button is hidden without it. */
  onToggleHideAmounts?: () => void
}

export function WalletCard({
  address,
  xlmBalance,
  usdcBalance,
  hideAmounts = false,
  onToggleHideAmounts,
}: WalletCardProps) {
  const [copied, setCopied] = useState(false)
  const showBalance = !hideAmounts

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayAddress = address.slice(0, 4) + '...' + address.slice(-4)
import type { AssetBalance } from '@/features/dashboard/models'
import { Sparkline } from '@/components/sparkline'

interface WalletCardProps {
  asset: AssetBalance
}

/** Per-asset balance card: one is rendered for every asset the wallet holds. */
export function WalletCard({ asset }: WalletCardProps) {
  const { code, issuer, balance, value, change24h, history } = asset
  const change = change24h ?? 0
  const isNative = issuer === 'native'
  const displayIssuer = isNative ? 'Native asset' : `${issuer.slice(0, 6)}...${issuer.slice(-4)}`
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card border border-border p-5 space-y-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{code.slice(0, 1)}</span>
          </div>
          {onToggleHideAmounts && (
            <button
              onClick={onToggleHideAmounts}
              aria-pressed={hideAmounts}
              aria-label={hideAmounts ? 'Show balances' : 'Hide balances'}
              title={hideAmounts ? 'Show balances' : 'Hide balances'}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          )}
        </div>

        {/* Balances */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">XLM Balance</p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {showBalance ? xlmBalance.toFixed(2) : MASKED_AMOUNT}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {showBalance ? `≈ $${(xlmBalance * 0.11).toFixed(2)}` : '≈ ••••••'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">USDC Balance</p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {showBalance ? usdcBalance.toFixed(2) : MASKED_AMOUNT}
            </p>
            <p className="text-xs text-muted-foreground mt-1">1:1 USD</p>
          <div>
            <p className="font-semibold text-foreground">{code}</p>
            <p className="text-xs text-muted-foreground font-mono">{displayIssuer}</p>
          </div>
        </div>
        {change24h !== undefined && (
          <span
            className={`text-sm font-semibold ${
              trend === 'up'
                ? 'text-green-500'
                : trend === 'down'
                  ? 'text-red-500'
                  : 'text-muted-foreground'
            }`}
          >
            {change > 0 ? '+' : ''}
            {change.toFixed(2)}%
          </span>
        )}
      </div>

      {history && history.length > 1 && (
        <Sparkline points={history} trend={trend} label={`${code} value over the last 7 days`} />
      )}

        {/* Total Value */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
          <p className="text-4xl font-bold text-primary mt-2">
            {showBalance ? `$${(xlmBalance * 0.11 + usdcBalance).toFixed(2)}` : MASKED_AMOUNT}
          </p>
      <div className="flex items-end justify-between pt-2 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Balance</p>
          <p className="text-xl font-bold text-foreground mt-1">{balance.toFixed(4)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Value</p>
          <p className="text-xl font-bold text-primary mt-1">${value.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
