export interface NotificationPreferences {
  email: boolean
  push: boolean
  sms: boolean
}

export interface UserPreferences {
  currency?: string
  locale?: string
  theme?: string
  notifications?: NotificationPreferences
}

export interface UpdatePreferencesPayload {
  preferences: string // JSON stringified UserPreferences
}

export type ApiKeyStatus = 'active' | 'rotating' | 'revoked'

export interface ApiKeySummary {
  id: string
  name: string
  prefix: string
  scope: string
  isActive: boolean
  status: ApiKeyStatus
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
  expiresAt: string | null
  rotationOfId: string | null
  rotationExpiresAt: string | null
}

export interface CreateApiKeyResult {
  id: string
  key: string
  prefix: string
  scope: string
  createdAt: string
}

export interface RotateApiKeyResult extends CreateApiKeyResult {
  rotationExpiresAt: string
  message: string
}

