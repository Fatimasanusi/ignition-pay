'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, Send, ArrowDownUp, History, Anchor, Settings, Menu, X } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Wallet },
  { href: '/send', label: 'Send', icon: Send },
  { href: '/receive', label: 'Receive', icon: ArrowDownUp },
  { href: '/history', label: 'History', icon: History },
  { href: '/anchors', label: 'Anchors', icon: Anchor },
  { href: '/settings', label: 'Settings', icon: Settings },
]

/** The four primary destinations, surfaced as a bottom tab bar on mobile. */
const bottomTabs = navItems.filter((item) =>
  ['/dashboard', '/send', '/receive', '/history'].includes(item.href),
)

export function Navigation() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Navigation */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
            <Wallet size={24} />
            <span>Ignition Pay</span>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-foreground"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-border">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-border last:border-b-0 transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* Mobile Bottom Tabs */}
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-4">
          {bottomTabs.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={20} aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
            <Wallet size={24} />
            <span>Ignition Pay</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Ignition Pay v1.0
          </div>
          <div className="text-xs text-muted-foreground">
            Stellar Native
          </div>
        </div>
      </aside>
    </>
  )
}
