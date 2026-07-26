'use client'

import { useState } from 'react'
import {
  Bell,
  Lock,
  User,
  Eye,
  EyeOff,
  Zap,
  Shield,
  LogOut,
  Copy,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { APP_VERSION } from '@/lib/version'
import { useAnalyticsConsent } from '@/hooks/use-consent'
import { usePreferences } from '../state'
import { updateProfile } from '../services'

export function SettingsPage() {
  const [showSeed, setShowSeed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [notifications, setNotifications] = useState({
    payments: true,
    anchors: true,
    security: true,
    news: false,
  })
  const { consented, setConsented } = useAnalyticsConsent()
  const { preferences, save, saving } = usePreferences()

  const mockSeedPhrase =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

  const copySeed = () => {
    navigator.clipboard.writeText(mockSeedPhrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
              <p className="text-muted-foreground mt-1">
                Manage your wallet and account preferences
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost">← Back</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Account Section */}
        <div className="bg-card rounded-xl border border-border p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Account</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex-1 mr-4">
                <p className="font-semibold text-foreground mb-1">Display Name</p>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => {
                    if (displayName) updateProfile({ displayName })
                  }}
                  placeholder="Your display name"
                  className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex-1 mr-4">
                <p className="font-semibold text-foreground mb-1">Avatar URL</p>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  onBlur={() => {
                    if (avatarUrl) updateProfile({ avatarUrl })
                  }}
                  placeholder="https://example.com/avatar.png"
                  className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Public Address</p>
                <p className="text-sm text-muted-foreground font-mono">
                  GBKXNRTZQVD6CNOQNRZVMJVQ4ZQ5K...
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Copy size={16} className="mr-2" />
                Copy
              </Button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Account Created</p>
                <p className="text-sm text-muted-foreground">432 days ago</p>
              </div>
              <div className="text-sm text-muted-foreground">Since Jan 1, 2023</div>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold text-foreground">App Version</p>
                <p className="text-sm text-muted-foreground">Semantic version shown in settings</p>
              </div>
              <div className="text-sm font-medium text-foreground">v{APP_VERSION}</div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-card rounded-xl border border-border p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <Shield size={20} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Security</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Password</p>
                <p className="text-sm text-muted-foreground">Last changed 2 months ago</p>
              </div>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Biometric Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Fingerprint / Face ID enabled
                </p>
              </div>
              <div className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-500 font-semibold">
                Enabled
              </div>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Two-Factor Auth</p>
                <p className="text-sm text-muted-foreground">Authenticator app</p>
              </div>
              <div className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-500 font-semibold">
                Active
              </div>
            </div>

            {/* Seed Phrase Section */}
            <div className="mt-8 p-4 rounded-lg bg-red-500/5 border border-red-500/30">
              <div className="flex items-start gap-3 mb-4">
                <Lock size={20} className="text-red-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Recovery Seed Phrase</p>
                  <p className="text-sm text-muted-foreground">
                    Keep this safe! You&apos;ll need it if you lose access to your device.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSeed(!showSeed)}
                className="mb-3 text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                {showSeed ? <EyeOff size={16} /> : <Eye size={16} />}
                {showSeed ? 'Hide' : 'Show'} Recovery Phrase
              </button>

              {showSeed && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 bg-background rounded-lg p-4 font-mono text-sm">
                    {mockSeedPhrase.split(' ').map((word, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="text-foreground">{word}</span>
                      </div>
                    ))}
                  </div>

                  <Button variant="outline" className="w-full" onClick={copySeed}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy Phrase'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-card rounded-xl border border-border p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Bell size={20} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Notifications</h2>
          </div>

          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between py-4 border-b border-border last:border-b-0"
              >
                <div>
                  <p className="font-semibold text-foreground capitalize">
                    {key === 'payments'
                      ? 'Payment Alerts'
                      : key === 'anchors'
                        ? 'Anchor Updates'
                        : key === 'security'
                          ? 'Security Alerts'
                          : 'News & Updates'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {key === 'payments'
                      ? 'Notify when you send or receive payments'
                      : key === 'anchors'
                        ? 'Notify when anchors go online/offline'
                        : key === 'security'
                          ? 'Notify about suspicious activity'
                          : 'Notify about Ignition Pay updates'}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => {
                      const next = { ...notifications, [key]: !value }
                      setNotifications(next)
                      save({
                        ...preferences,
                        notifications: {
                          email: next.payments,
                          push: next.security,
                          sms: next.anchors,
                        },
                      })
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-card rounded-xl border border-border p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <BarChart3 size={20} className="text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold text-foreground">
                  Analytics &amp; Usage Data
                </p>
                <p className="text-sm text-muted-foreground">
                  Help improve Ignition Pay by sharing anonymous usage data.
                  No personal or financial information is collected.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={() => setConsented(!consented)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-card rounded-xl border border-border p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Zap size={20} className="text-purple-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Currency</p>
                <p className="text-sm text-muted-foreground">{preferences.currency}</p>
              </div>
              <select
                value={preferences.currency}
                onChange={(e) =>
                  save({ ...preferences, currency: e.target.value })
                }
                disabled={saving}
                className="px-3 py-1 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-border">
              <div>
                <p className="font-semibold text-foreground">Theme</p>
                <p className="text-sm text-muted-foreground">Dark Mode</p>
              </div>
              <select className="px-3 py-1 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary">
                <option>Dark</option>
                <option>Light</option>
                <option>Auto</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <p className="font-semibold text-foreground">Language</p>
                <p className="text-sm text-muted-foreground">{preferences.locale === 'en' ? 'English' : preferences.locale === 'es' ? 'Spanish' : preferences.locale === 'fr' ? 'French' : preferences.locale}</p>
              </div>
              <select
                value={preferences.locale}
                onChange={(e) =>
                  save({ ...preferences, locale: e.target.value })
                }
                disabled={saving}
                className="px-3 py-1 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 rounded-xl border border-red-500/30 p-8 space-y-6">
          <h2 className="text-xl font-bold text-red-500">Danger Zone</h2>

          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-red-500 border-red-500/30 hover:bg-red-500/5"
            >
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Clear Local Data
            </Button>
            <p className="text-sm text-muted-foreground">
              Signing out will remove your session. Your account will remain secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

