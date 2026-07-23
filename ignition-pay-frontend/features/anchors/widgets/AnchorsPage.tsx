'use client'

import { ArrowUpRight, ArrowDownLeft, TrendingUp, Lock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const anchors = [
  {
    id: 1,
    name: 'StellarX',
    description: 'Fast USD on/off ramps with verified anchors',
    icon: 'SX',
    supported: ['USD', 'EUR'],
    minDeposit: 50,
    maxDeposit: 10000,
    fee: '1.5%',
    verified: true,
  },
  {
    id: 2,
    name: 'AnchorUSD',
    description: 'USDC liquidity and fiat settlement',
    icon: 'AU',
    supported: ['USD'],
    minDeposit: 100,
    maxDeposit: 50000,
    fee: '2.0%',
    verified: true,
  },
  {
    id: 3,
    name: 'GateHub',
    description: 'Multi-currency anchor with market rates',
    icon: 'GH',
    supported: ['USD', 'EUR', 'GBP'],
    minDeposit: 50,
    maxDeposit: 25000,
    fee: '1.8%',
    verified: true,
  },
  {
    id: 4,
    name: 'PayMunk',
    description: 'Asia-focused payment anchor',
    icon: 'PM',
    supported: ['INR', 'PHP', 'THB'],
    minDeposit: 10,
    maxDeposit: 5000,
    fee: '2.5%',
    verified: false,
  },
]

export default function AnchorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Anchor Integrations
              </h1>
              <p className="text-muted-foreground mt-1">
                Seamlessly connect with trusted anchors for fiat on/off ramps
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost">← Back</Button>
            </Link>
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex gap-3">
            <Lock size={20} className="text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground">
              <p className="font-semibold">Secure anchor connections</p>
              <p className="text-muted-foreground">
                All anchor integrations follow SEP-6, SEP-24, and SEP-31 standards. Your keys remain under your control.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Featured Anchors
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {anchors.slice(0, 2).map((anchor) => (
              <div
                key={anchor.id}
                className="bg-card rounded-2xl border border-primary/30 p-8 space-y-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                      {anchor.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {anchor.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {anchor.description}
                      </p>
                    </div>
                  </div>
                  {anchor.verified && (
                    <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold">
                      Verified
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-border pt-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Supported Currencies</span>
                    <span className="font-semibold text-foreground">
                      {anchor.supported.join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min/Max Deposit</span>
                    <span className="font-semibold text-foreground">
                      ${anchor.minDeposit} - ${anchor.maxDeposit.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Transaction Fee</span>
                    <span className="font-semibold text-foreground">
                      {anchor.fee}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1">
                    <ArrowDownLeft className="mr-2 h-4 w-4" />
                    Deposit
                  </Button>
                  <Button className="flex-1 bg-primary hover:bg-primary/90">
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                    Withdraw
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            All Available Anchors
          </h2>
          <div className="space-y-3">
            {anchors.map((anchor) => (
              <div
                key={anchor.id}
                className="bg-card rounded-xl border border-border p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                      {anchor.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {anchor.name}
                        </h3>
                        {anchor.verified && (
                          <div className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold">
                            Verified
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {anchor.description}
                      </p>
                      <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                        <span>Currencies: {anchor.supported.join(', ')}</span>
                        <span>Fee: {anchor.fee}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 bg-card rounded-xl border border-border p-8 space-y-6">
          <h2 className="text-2xl font-bold text-foreground">
            Supported SEP Standards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="font-semibold text-primary">SEP-6</div>
              <p className="text-sm text-muted-foreground">
                Non-interactive asset transfer
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-primary">SEP-24</div>
              <p className="text-sm text-muted-foreground">
                Interactive deposit/withdrawal
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-primary">SEP-31</div>
              <p className="text-sm text-muted-foreground">
                Cross-border direct payments
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-primary">SEP-38</div>
              <p className="text-sm text-muted-foreground">
                Anchor RFQ and pricing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

