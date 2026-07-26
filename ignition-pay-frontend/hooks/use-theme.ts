'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeMode, applyTheme, getStoredTheme, storeTheme } from '@/lib/theme'

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system'
  return getStoredTheme()
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    const current = getStoredTheme()
    setModeState(current)
    applyTheme(current)

    if (current === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const [hydrated, setHydrated] = useState(false)
  const mqlRef = useRef<MediaQueryList | null>(null)
  const handlerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const stored = getStoredTheme()
    setModeState(stored)
    applyTheme(stored)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    const mql = mqlRef.current ?? window.matchMedia('(prefers-color-scheme: dark)')
    mqlRef.current = mql

    if (handlerRef.current) {
      mql.removeEventListener('change', handlerRef.current)
      handlerRef.current = null
    }

    if (mode === 'system') {
      const handler = () => applyTheme('system')
      handlerRef.current = handler
      mql.addEventListener('change', handler)
      applyTheme('system')
    }

    return () => {
      if (handlerRef.current) {
        mql.removeEventListener('change', handlerRef.current)
        handlerRef.current = null
      }
    }
  }, [mode, hydrated])

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode)
    storeTheme(newMode)
    applyTheme(newMode)
  }, [])

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setMode])

  const isDark = hydrated && (mode === 'dark' || (mode === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches))
  const isLight = hydrated && !isDark
  const isSystem = mode === 'system'

}
  return { mode, setMode, toggle, isDark, isLight, isSystem, hydrated }
}
