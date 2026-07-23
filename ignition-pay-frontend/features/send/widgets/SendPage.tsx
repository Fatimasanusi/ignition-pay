'use client'

import { useState } from 'react'
import { Send, Zap, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export function SendPage() {
  const [step, setStep] = useState<'form' | 'review' | 'confirmed'>('form')
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    asset: 'XLM',
    memo: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('review')
  }

  const handleConfirm = () => {
    setStep('confirmed')
  }

  const handleReset = () => {
    setStep('form')
    setFormData({ recipient: '', amount: '', asset: 'XLM', memo: '' })
  }

  if (step === 'confirmed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-primary/30 p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Payment Sent!</h2>
              <p className="text-muted-foreground mt-2">
                Your {formData.amount} {formData.asset} has been sent successfully.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Recipient</p>
                <p className="text-foreground font-mono text-xs">
                  {formData.recipient.slice(0, 8)}...
                  {formData.recipient.slice(-8)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="text-foreground font-semibold">
                  {formData.amount} {formData.asset}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Network Fee</p>
                <p className="text-foreground font-semibold">0.00001 XLM</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReset}
              >
                Send Another
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-foreground">Send Payment</h1>
          <p className="text-muted-foreground mt-1">
            Transfer XLM, USDC, or other Stellar assets instantly
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
              step === 'form' || step === 'review' || step === 'confirmed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            1
          </div>
          <div
            className={`flex-1 h-1 transition-all ${
              step === 'review' || step === 'confirmed' ? 'bg-primary' : 'bg-muted'
            }`}
          />
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
              step === 'review' || step === 'confirmed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            2
          </div>
          <div
            className={`flex-1 h-1 transition-all ${
              step === 'confirmed' ? 'bg-primary' : 'bg-muted'
            }`}
          />
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
              step === 'confirmed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            3
          </div>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  value={formData.recipient}
                  onChange={(e) =>
                    setFormData({ ...formData, recipient: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The Stellar address you want to send funds to
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Asset</label>
                  <select
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:border-primary"
                    value={formData.asset}
                    onChange={(e) =>
                      setFormData({ ...formData, asset: e.target.value })
                    }
                  >
                    <option value="XLM">XLM (Stellar Lumens)</option>
                    <option value="USDC">USDC</option>
                    <option value="AQUA">AQUA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Amount</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Memo (Optional)</label>
                <textarea
                  placeholder="Add a note for this transaction..."
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                  rows={3}
                  value={formData.memo}
                  onChange={(e) =>
                    setFormData({ ...formData, memo: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Add a note to help identify this transaction
                </p>
              </div>

              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex gap-3">
                <Zap size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p className="font-semibold">Lightning-fast settlement</p>
                  <p className="text-muted-foreground">
                    Stellar transactions settle in about 5 seconds with minimal fees.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">Cancel</Button>
              </Link>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={!formData.recipient || !formData.amount}
              >
                <Send className="mr-2 h-4 w-4" />
                Review Payment
              </Button>
            </div>
          </form>
        )}

        {/* Review Step */}
        {step === 'review' && (
          <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6 space-y-6">
              <h2 className="text-xl font-bold text-foreground">Review Payment</h2>

              <div className="space-y-4 bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recipient Address</span>
                  <span className="font-mono text-sm text-foreground">
                    {formData.recipient.slice(0, 8)}...
                    {formData.recipient.slice(-8)}
                  </span>
                </div>
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    {formData.amount} {formData.asset}
                  </span>
                </div>
                <div className="border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="font-semibold text-foreground">0.00001 XLM</span>
                </div>
                {formData.memo && (
                  <div className="border-t border-border pt-4">
                    <p className="text-muted-foreground text-sm mb-1">Memo</p>
                    <p className="text-foreground">{formData.memo}</p>
                  </div>
                )}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex gap-3">
                <AlertCircle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p className="font-semibold">Please review carefully</p>
                  <p className="text-muted-foreground">
                    Transactions on blockchain are permanent and cannot be reversed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep('form')}
              >
                Back to Edit
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleConfirm}
              >
                <Send className="mr-2 h-4 w-4" />
                Confirm & Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

