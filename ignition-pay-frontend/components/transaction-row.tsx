'use client'

import { ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react'
import type { Transaction, OptimisticTransaction } from '@/features/history/models'
import { isOptimisticTransaction } from '@/features/history/models'

interface TransactionRowProps {
  transaction: Transaction | OptimisticTransaction
}

/**
 * Status badge component that handles both real and optimistic transactions.
 * Optimistic transactions show a loading spinner to indicate pending confirmation.
 */
function TransactionStatusBadge({
  transaction,
}: {
  transaction: Transaction | OptimisticTransaction
}) {
  const isOptimistic = isOptimisticTransaction(transaction)

  if (isOptimistic) {
    return (
      <span
        className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center gap-1"
        aria-label="Transaction pending confirmation"
        aria-live="polite"
      >
        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        Pending...
      </span>
    )
  }

  if (transaction.status === 'pending') {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-500">
        Pending
      </span>
    )
  }

  return null
}

interface TransactionRowProps {
  transaction: Transaction | OptimisticTransaction
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const { type, asset, amount, recipient, timestamp, status } = transaction
  const displayRecipient = recipient.slice(0, 6) + '...' + recipient.slice(-4)
  const isSent = type === 'sent'

  const formattedDate = timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const isOptimistic = isOptimisticTransaction(transaction)

  return (
    <div
      className={`flex items-center justify-between py-4 px-4 rounded-lg transition-colors border ${
        isOptimistic
          ? 'bg-yellow-500/5 border-yellow-500/30 hover:bg-yellow-500/10'
          : 'border-transparent hover:bg-muted/50 hover:border-border'
      }`}
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            isSent ? 'bg-red-500/20' : 'bg-green-500/20'
          } ${isOptimistic ? 'opacity-60' : ''}`}
        >
          {isSent ? (
            <ArrowUpRight size={20} className="text-red-500" />
          ) : (
            <ArrowDownLeft size={20} className="text-green-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${isOptimistic ? 'text-muted-foreground' : 'text-foreground'}`}>
            {isSent ? 'Sent' : 'Received'} {asset}
          </p>
          <p className="text-sm text-muted-foreground truncate">{displayRecipient}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <p className={`font-semibold ${isSent ? 'text-red-500' : 'text-green-500'} ${isOptimistic ? 'opacity-70' : ''}`}>
          {isSent ? '-' : '+'}
          {amount.toFixed(4)} {asset}
        </p>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
        <TransactionStatusBadge transaction={transaction} />
      </div>
    </div>
  )
}
