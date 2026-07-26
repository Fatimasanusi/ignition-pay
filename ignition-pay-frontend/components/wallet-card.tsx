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

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/30 p-8 shadow-lg">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full -ml-16 -mb-16" />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Wallet Address</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-lg font-mono text-primary">{displayAddress}</code>
              <button
                onClick={copyAddress}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Copy size={16} />
              </button>
            </div>
            {copied && <p className="text-xs text-primary mt-1">Copied!</p>}
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
          </div>
        </div>

        {/* Total Value */}
        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Value</p>
          <p className="text-4xl font-bold text-primary mt-2">
            {showBalance ? `$${(xlmBalance * 0.11 + usdcBalance).toFixed(2)}` : MASKED_AMOUNT}
          </p>
        </div>
      </div>
    </div>
  )
}
