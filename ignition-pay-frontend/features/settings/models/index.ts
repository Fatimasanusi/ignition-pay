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

