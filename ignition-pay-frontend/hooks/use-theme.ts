'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeMode, applyTheme, getStoredTheme, storeTheme } from '@/lib/theme'

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    const stored = getStoredTheme()
    setModeState(stored)
    applyTheme(stored)

    if (stored === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    storeTheme(newMode)
    applyTheme(newMode)
  }, [])

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setMode])

  const isDark = mode === 'dark'
  const isLight = mode === 'light'
  const isSystem = mode === 'system'

  return { mode, setMode, toggle, isDark, isLight, isSystem }
}
