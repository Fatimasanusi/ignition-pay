'use client'

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

const modeOrder: ThemeMode[] = ['light', 'dark', 'system']

export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const Icon = modeIcon[mode]

  const cycle = () => {
    const idx = modeOrder.indexOf(mode)
    setMode(modeOrder[(idx + 1) % modeOrder.length])
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={modeLabel[mode]}
      title={modeLabel[mode]}
    >
      <Icon size={18} />
    </Button>
  )
}
