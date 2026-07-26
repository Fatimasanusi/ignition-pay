'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Send, ArrowDownLeft, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletCard } from '@/components/wallet-card'
import { PortfolioSummaryCard } from '@/components/portfolio-summary-card'
import { TransactionRow } from '@/components/transaction-row'
import { InlineEmpty, InlineError, InlineSkeleton } from '@/components/inline-state'
import { groupAssets, portfolioChange24h, totalValue } from '@/features/dashboard/models'
import { DEMO_WALLET_ADDRESS } from '@/features/dashboard/services'
import { useWalletBalances } from '@/features/dashboard/state'
import { ThemeToggle } from '@/components/theme-toggle'

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
]

export function DashboardPage() {
  const { snapshot, status, error, isRefreshing, isLive, refresh } =
    useWalletBalances(DEMO_WALLET_ADDRESS)

  const assets = useMemo(() => snapshot?.assets ?? [], [snapshot])
  const groups = useMemo(() => groupAssets(assets), [assets])
  const portfolioValue = useMemo(() => totalValue(assets), [assets])
  const dailyChange = useMemo(() => portfolioChange24h(assets), [assets])
  const isPositive = dailyChange >= 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back! Here&apos;s your wallet overview.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/receive">
                <Button variant="outline">
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                  Receive
                </Button>
              </Link>
              <Link href="/send">
                <Button className="bg-primary hover:bg-primary/90">
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Portfolio summary */}
        {status === 'loading' && !snapshot && (
          <div
            role="status"
            aria-live="polite"
            className="h-56 rounded-2xl border border-border bg-card animate-pulse"
          >
            <span className="sr-only">Loading wallet balances</span>
          </div>
        )}

        {status === 'error' && !snapshot && (
          <InlineError
            title="Could not load your balances"
            message={error ?? 'Please try again in a moment.'}
            onRetry={refresh}
          />
        )}

        {snapshot && (
          <>
            {status === 'error' && error && (
              <InlineError title="Balances may be out of date" message={error} onRetry={refresh} />
            )}
            <PortfolioSummaryCard
              address={snapshot.address}
              totalValue={portfolioValue}
              change24h={dailyChange}
              assetCount={assets.length}
              updatedAt={snapshot.updatedAt}
              isRefreshing={isRefreshing}
              isLive={isLive}
              onRefresh={refresh}
            />
          </>
        )}

        {/* Assets, grouped by asset kind */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Assets</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your Stellar assets and balances
              </p>
            </div>
            {snapshot && assets.length > 0 && (
              <div
                className={`flex items-center gap-2 ${isPositive ? 'text-primary' : 'text-red-500'}`}
              >
                <TrendingUp size={16} />
                <span className="text-sm font-medium">
                  Portfolio {isPositive ? 'up' : 'down'} {Math.abs(dailyChange).toFixed(1)}% today
                </span>
              </div>
            )}
          </div>

          {status === 'loading' && !snapshot && <InlineSkeleton label="Loading assets" />}

          {status === 'error' && !snapshot && (
            <InlineError
              title="Assets unavailable"
              message={error ?? 'We could not reach the wallet service.'}
              onRetry={refresh}
            />
          )}

          {snapshot && assets.length === 0 && (
            <InlineEmpty
              title="No assets yet"
              description="Fund this wallet or receive a payment to see balances here."
              action={
                <Link href="/receive">
                  <Button variant="outline">
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                    Receive funds
                  </Button>
                </Link>
              }
            />
          )}

          {groups.length > 0 && (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.category} aria-labelledby={`asset-group-${group.category}`}>
                  <div className="flex items-baseline justify-between mb-3">
                    <div>
                      <h3
                        id={`asset-group-${group.category}`}
                        className="text-sm font-semibold uppercase tracking-wide text-foreground"
                      >
                        {group.label}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">{group.description}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      ${group.totalValue.toFixed(2)}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.assets.map((asset) => (
                      <WalletCard key={`${asset.code}-${asset.issuer}`} asset={asset} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Recent Transactions</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your latest activity on the Stellar network
              </p>
            </div>
            <Link href="/history">
              <Button variant="ghost">View All</Button>
            </Link>
          </div>
          {mockTransactions.length === 0 ? (
            <InlineEmpty
              title="No transactions yet"
              description="Payments you send or receive will appear here."
            />
          ) : (
            <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
              {mockTransactions.map((tx) => (
                <TransactionRow key={tx.id} {...tx} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground text-sm">Total Transactions</p>
            <p className="text-3xl font-bold text-primary mt-2">156</p>
            <p className="text-xs text-muted-foreground mt-2">All time on Stellar</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground text-sm">Network Fee Saved</p>
            <p className="text-3xl font-bold text-green-500 mt-2">$127.85</p>
            <p className="text-xs text-muted-foreground mt-2">vs traditional payment</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <p className="text-muted-foreground text-sm">Account Age</p>
            <p className="text-3xl font-bold text-foreground mt-2">432 days</p>
            <p className="text-xs text-muted-foreground mt-2">Active Stellar member</p>
          </div>
        </div>
      </div>
    </div>
  )
}
