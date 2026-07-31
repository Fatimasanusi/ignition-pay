'use client'

import { useState, useCallback } from 'react'
import type { UserPreferences } from '../models'
import { updatePreferences } from '../services'

const DEFAULT_PREFERENCES: UserPreferences = {
  currency: 'USD',
  locale: 'en',
  theme: 'Dark',
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [saving, setSaving] = useState(false)

  const save = useCallback(async (next: UserPreferences) => {
    setSaving(true)
    try {
      await updatePreferences(next)
      setPreferences(next)
    } finally {
      setSaving(false)
    }
  }, [])

  return { preferences, setPreferences, save, saving }
}

