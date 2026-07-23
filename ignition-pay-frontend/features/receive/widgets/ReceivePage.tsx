'use client'

import { useState } from 'react'
import { Copy, Download, Share2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const MOCK_ADDRESS = 'GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5K2NQXJ6K4VJKTQVJVQVJVQVJVQ'

export function ReceivePage() {
  const [copied, setCopied] = useState(false)
  const [showMemo, setShowMemo] = useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(MOCK_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                ← Back
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Receive Payment</h1>
          <p className="text-muted-foreground mt-1">
            Share your address to receive XLM, USDC, and other Stellar assets
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* QR Code Section */}
          <div className="bg-card rounded-2xl border border-primary/30 p-8 flex flex-col items-center gap-6">
            <div className="w-64 h-64 bg-white rounded-lg border-8 border-primary p-4 flex items-center justify-center">
              <div className="grid grid-cols-7 gap-1 w-full h-full">
                {Array(49)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className={`${Math.random() > 0.6 ? 'bg-black' : 'bg-white'}`}
                    />
                  ))}
              </div>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                Scan this QR code to receive a payment
              </p>
            </div>
          </div>

          {/* Address Section */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Your Stellar Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={MOCK_ADDRESS}
                  readOnly
                  className="w-full px-4 py-4 rounded-lg bg-muted/50 border border-border text-foreground font-mono text-sm pr-12"
                />
                <button
                  onClick={copyAddress}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <Copy size={20} />
                </button>
              </div>
              {copied && <p className="text-xs text-primary mt-2">Address copied!</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                Share Address
              </Button>
              <Button variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download QR
              </Button>
            </div>
          </div>

          {/* Memo Section */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Payment Memo</h3>
              <button
                onClick={() => setShowMemo(!showMemo)}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {showMemo ? 'Hide' : 'Show'}
              </button>
            </div>

            {showMemo && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add a memo to identify incoming payments. The sender must include this memo with their transaction.
                </p>
                <input
                  type="text"
                  placeholder="Enter a payment memo (optional)"
                  maxLength={28}
                  className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Memo helps you identify and categorize incoming payments
                </p>
              </div>
            )}
          </div>

          {/* Asset Info */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Assets You Can Receive</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary">X</span>
                </div>
                <p className="font-semibold text-foreground">XLM</p>
                <p className="text-xs text-muted-foreground">Stellar Lumens - Native asset</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="font-bold text-blue-500">U</span>
                </div>
                <p className="font-semibold text-foreground">USDC</p>
                <p className="text-xs text-muted-foreground">USD Coin - Stablecoin</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="font-bold text-green-500">A</span>
                </div>
                <p className="font-semibold text-foreground">AQUA</p>
                <p className="text-xs text-muted-foreground">Aquarius Token - DEX Token</p>
              </div>
            </div>
          </div>

          {/* Safety Tips */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-foreground">Safety Tips</h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Always verify you&apos;re sharing your address with trusted parties</li>
              <li>Never share your private key or seed phrase</li>
              <li>Use memos to help identify large payments</li>
              <li>You can safely share your public address with anyone</li>
            </ul>
          </div>

          <div>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

