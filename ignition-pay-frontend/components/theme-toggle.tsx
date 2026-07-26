'use client'

import { useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import type { ThemeMode } from '@/lib/theme'

const modeIcon: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const modeLabel: Record<ThemeMode, string> = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'System theme',
}

const modeAriaLabel: Record<ThemeMode, string> = {
  light: 'Switch to dark mode',
  dark: 'Switch to system theme',
  system: 'Switch to light mode',
}

const modeOrder: ThemeMode[] = ['light', 'dark', 'system']

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const [announcement, setAnnouncement] = useState('')
  const Icon = modeIcon[mode]

  const cycle = () => {
    const idx = modeOrder.indexOf(mode)
    const nextMode = modeOrder[(idx + 1) % modeOrder.length]
    setMode(nextMode)
    setAnnouncement(`Theme changed to ${nextMode} mode`)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={cycle}
        aria-label={modeAriaLabel[mode]}
        title={modeLabel[mode]}
        aria-pressed={mode === 'dark'}
      >
        <Icon size={18} />
      </Button>
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  )
}

export default ThemeToggle