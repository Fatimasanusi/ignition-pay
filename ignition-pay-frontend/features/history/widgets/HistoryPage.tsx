'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
    txHash: 'abc123def456',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '2',
    type: 'received' as const,
    asset: 'USDC',
    amount: 500.0,
    recipient: 'GBJCHUKZMTFSLOMNC7P4TS4VJJBTCYL3YCWKEANE7FCNHWHP6ZPWPX3',
    txHash: 'bcd234ef567',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '3',
    type: 'sent' as const,
    asset: 'AQUA',
    amount: 50.0,
    recipient: 'GAJDLFWC3H2LMYMVLYWE3MID4YSKKFVDBMPUEPBJ4PBGQRGKQTKJLXDX',
    txHash: 'cde345fg678',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000),
    status: 'pending' as const,
  },
  {
    id: '4',
    type: 'received' as const,
    asset: 'XLM',
    amount: 250.5,
    recipient: 'GCJQNZFYXGX6XNXAKF3CDXZ3XGNXSJN3FVXQXGNJQXGNJXGNJXGNJXG',
    txHash: 'def456gh789',
    timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '5',
    type: 'sent' as const,
    asset: 'USDC',
    amount: 1000.0,
    recipient: 'GBQABHNZ2EXZCVSQGX4N3TDPQF3Z2JKPFQZQGJXGNJQXGNJXGNJXGNJXG',
    txHash: 'efg567hi890',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
  {
    id: '6',
    type: 'received' as const,
    asset: 'XLM',
    amount: 75.25,
    recipient: 'GCJQNZFYXGX6XNXAKF3CDXZ3XGNXSJN3FVXQXGNJQXGNJXGNJXGNJXG',
    txHash: 'fgh678ij901',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'confirmed' as const,
  },
]

const PAGE_SIZE = 4
// Derive the set of distinct asset codes from the mock data
const ASSET_OPTIONS = ['all', ...Array.from(new Set(mockTransactions.map((t) => t.asset)))]
const STATUS_OPTIONS = ['all', 'confirmed', 'pending'] as const
type StatusOption = (typeof STATUS_OPTIONS)[number]

export function HistoryPage() {
  const [filterType, setFilterType] = useState<'all' | 'sent' | 'received'>('all')
  const [filterAsset, setFilterAsset] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<StatusOption>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [visibleTransactions, setVisibleTransactions] = useState<typeof mockTransactions>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const filteredTransactions = useMemo(() => {
    return mockTransactions.filter((tx) => {
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
  }, [filterType, searchTerm])

  useEffect(() => {
    const firstPage = filteredTransactions.slice(0, PAGE_SIZE)
    setVisibleTransactions(firstPage)
    setCursor(firstPage.at(-1)?.id ?? null)
    setHasMore(filteredTransactions.length > firstPage.length)
    setIsLoadingMore(false)
  }, [filteredTransactions])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries

        if (entry?.isIntersecting && !isLoadingMore) {
          const currentIndex = filteredTransactions.findIndex((tx) => tx.id === cursor)
          const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0
          const nextPage = filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE)

          if (nextPage.length === 0) {
            setHasMore(false)
            return
          }

          setIsLoadingMore(true)
          setVisibleTransactions((prev) => [...prev, ...nextPage])
          setCursor(nextPage.at(-1)?.id ?? null)
          setHasMore(startIndex + nextPage.length < filteredTransactions.length)
          setIsLoadingMore(false)
        }
      },
      { rootMargin: '200px 0px' },
    )

    observer.observe(sentinelRef.current)

    return () => observer.disconnect()
  }, [cursor, filteredTransactions, hasMore, isLoadingMore])
  const filteredTransactions = mockTransactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (filterAsset !== 'all' && tx.asset !== filterAsset) return false
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false

    if (dateFrom) {
      const from = new Date(dateFrom)
      from.setHours(0, 0, 0, 0)
      if (tx.timestamp < from) return false
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      if (tx.timestamp > to) return false
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const matchesAddress = tx.recipient.toLowerCase().includes(q)
      const matchesAsset = tx.asset.toLowerCase().includes(q)
      // txHash: exact match (trimmed)
      const matchesTxHash = tx.txHash?.toLowerCase() === q
      if (!matchesAddress && !matchesAsset && !matchesTxHash) return false
    }

    return true
  })

  const stats = {
    total: mockTransactions.length,
    sent: mockTransactions.filter((tx) => tx.type === 'sent').length,
    received: mockTransactions.filter((tx) => tx.type === 'received').length,
    totalVolume: mockTransactions.reduce((acc, tx) => acc + tx.amount, 0),
  }

  const hasActiveFilters =
    filterType !== 'all' ||
    filterAsset !== 'all' ||
    filterStatus !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    searchTerm !== ''

  function clearFilters() {
    setFilterType('all')
    setFilterAsset('all')
    setFilterStatus('all')
    setDateFrom('')
    setDateTo('')
    setSearchTerm('')
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
        <div className="px-6 py-4 max-w-7xl mx-auto space-y-3">

          {/* Row 1: search + export */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search by address, asset, or tx hash…"
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Asset dropdown */}
            <select
              aria-label="Filter by asset"
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:border-primary"
              value={filterAsset}
              onChange={(e) => setFilterAsset(e.target.value)}
            >
              {ASSET_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a === 'all' ? 'All assets' : a}
                </option>
              ))}
            </select>

            <Button variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>

          {/* Row 2: direction chips + status chips + date range */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Direction chips */}
            <div className="flex gap-2" role="group" aria-label="Filter by direction">
              {(['all', 'sent', 'received'] as const).map((d) => (
                <Button
                  key={d}
                  variant={filterType === d ? 'default' : 'outline'}
                  onClick={() => setFilterType(d)}
                  size="sm"
                >
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </Button>
              ))}
            </div>

            {/* Status chips */}
            <div className="flex gap-2" role="group" aria-label="Filter by status">
              {STATUS_OPTIONS.map((s) => (
                <Button
                  key={s}
                  variant={filterStatus === s ? 'default' : 'outline'}
                  onClick={() => setFilterStatus(s)}
                  size="sm"
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor="date-from">
                From
              </label>
              <input
                id="date-from"
                type="date"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:border-primary"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <label className="text-xs text-muted-foreground whitespace-nowrap" htmlFor="date-to">
                To
              </label>
              <input
                id="date-to"
                type="date"
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:border-primary"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
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
            {visibleTransactions.map((tx) => (
              <div key={tx.id}>
                <TransactionRow {...tx} />
              </div>
            ))}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4 text-sm text-muted-foreground">
                {isLoadingMore ? 'Loading more transactions…' : 'Scroll to load more'}
              </div>
            )}
            {!hasMore && visibleTransactions.length > 0 && (
              <div className="flex justify-center py-4 text-sm text-muted-foreground">
                You&apos;ve reached the end of the history.
              </div>
            )}
            {filteredTransactions.map((tx) => {
              // txHash is used for local search matching only; TransactionRow
              // doesn't accept it as a prop so we strip it before spreading.
              const { txHash: _txHash, ...rowProps } = tx
              return (
                <div key={tx.id}>
                  <TransactionRow {...rowProps} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
