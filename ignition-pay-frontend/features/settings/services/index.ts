import { API_ENDPOINTS, API_PREFIX, API_BASE_URLS } from '@/lib/constants'
import type { UserPreferences } from '../models'

export const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL
  return API_BASE_URLS.development
}

async function patchMe(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(
    `${getApiBase()}${API_PREFIX}${API_ENDPOINTS.users.me}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.message ?? 'Request failed')
  }
}

export async function updatePreferences(prefs: UserPreferences): Promise<void> {
  await patchMe({ preferences: JSON.stringify(prefs) })
}

export async function updateProfile(data: {
  displayName?: string
  avatarUrl?: string
}): Promise<void> {
  await patchMe(data)
}

