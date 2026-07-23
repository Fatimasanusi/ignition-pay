'use client'

import { useState } from 'react'
import { Download, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TransactionRow } from '@/components/transaction-row'

// Mock transactions (to be replaced by real API integration)
const mockTransactions = [
  {
    id: '1',
    type: 'sent' as const,
    asset: 'XLM',
    amount: 100.0,
    recipient: 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3YCWKEANE7FCNHWHP6ZPWPX3',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '2',
    type: 'received' as const,
    asset: 'USDC',
    amount: 500.0,
    recipient: 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3YCWKEANE7FCNHWHP6ZPWPX3',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '3',
    type: 'sent' as const,
    asset: 'AQUA',
    amount: 50.0,
    recipient: 'GAJDLFWC3H2LMYMVLYWE3MID4YSKKFVDBMPUEPBJ4PBGQRGKQTKJLXDX',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    status: 'pending' as const,
  },
  {
    id: '4',
    type: 'received' as const,
    asset: 'XLM',
    amount: 250.5,
    recipient: 'GCJQNZFYXGX6XNXAKF3CDXZ3XGNXSJN3FVXQXGNJQXGNJXGNJXGNJXG',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '5',
    type: 'sent' as const,
    asset: 'USDC',
    amount: 1000.0,
    recipient: 'GBQABHNZ2EXZCVSQGX4N3TDPQF3Z2JKPFQZQGJXGNJQXGNJXGNJXGNJXG',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '6',
    type: 'received' as const,
    asset: 'XLM',
    amount: 75.25,
    recipient: 'GCJQNZFYXGX6XNXAKF3CDXZ3XGNXSJN3FVXQXGNJQXGNJXGNJXGNJXG',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
]

export function HistoryPage() {
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredTransactions = mockTransactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (
      searchTerm &&
      !tx.asset.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !tx.recipient.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const stats = {
    total: mockTransactions.length,
    sent: mockTransactions.filter((tx) => tx.type === 'sent').length,
    received: mockTransactions.filter((tx) => tx.type === 'received').length,
    totalVolume: mockTransactions.reduce((acc, tx) => acc + tx.amount, 0),
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Transaction History
              </h1>
              <p className="text-muted-foreground mt-1">
                View all your Stellar transactions
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost">← Back</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase">
                Total Transactions
              </p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase">Sent</p>
              <p className="text-2xl font-bold text-red-500 mt-1">{stats.sent}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase">Received</p>
              <p className="text-2xl font-bold text-green-500 mt-1">{stats.received}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase">Total Volume</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {stats.totalVolume.toFixed(0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search by asset or address..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterType === 'sent' ? 'default' : 'outline'}
                onClick={() => setFilterType('sent')}
                size="sm"
              >
                Sent
              </Button>
              <Button
                variant={filterType === 'received' ? 'default' : 'outline'}
                onClick={() => setFilterType('received')}
                size="sm"
              >
                Received
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">No transactions found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div key={tx.id}>
                <TransactionRow {...tx} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

