'use client'

import Link from 'next/link'
import { Send, ArrowDownLeft, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletCard } from '@/components/wallet-card'
import { AssetCard } from '@/components/asset-card'
import { TransactionRow } from '@/components/transaction-row'

// Mock data (to be replaced by real API integration)
const mockWallet = {
  address: 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5K2NQXJ6K4VJKTQVJVQVJVQVJVQ',
  xlmBalance: 5234.5,
  usdcBalance: 2150.75,
}

const mockAssets = [
  {
    code: 'XLM',
    issuer: 'native',
    balance: 5234.5,
    value: 575.8,
    change24h: 5.2,
  },
  {
    code: 'USDC',
    issuer: 'GBBD47UZQ5ODSQIRQ73RQ5NBAYKU5NK2HRE3ENDQMAIL7UCHQVCD2Z4A',
    balance: 2150.75,
    value: 2150.75,
    change24h: 0.0,
  },
  {
    code: 'AQUA',
    issuer: 'GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTGKCYEG5MFWQVMBNXA5W2HAT',
    balance: 125.3,
    value: 31.33,
    change24h: -2.1,
  },
]

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
            <div className="flex gap-3">
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
        {/* Wallet Card */}
        <WalletCard
          address={mockWallet.address}
          xlmBalance={mockWallet.xlmBalance}
          usdcBalance={mockWallet.usdcBalance}
        />

        {/* Assets Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Assets</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Your Stellar assets and balances
              </p>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp size={16} />
              <span className="text-sm font-medium">Portfolio up 3.2% today</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockAssets.map((asset) => (
              <AssetCard key={asset.code} {...asset} />
            ))}
          </div>
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
          <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-hidden">
            {mockTransactions.map((tx) => (
              <TransactionRow key={tx.id} {...tx} />
            ))}
          </div>
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

