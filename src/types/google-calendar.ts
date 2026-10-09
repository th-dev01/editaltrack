export interface GoogleConnectionStatus {
  connected: boolean
  email: string | null
  connectedAt: string | null
  scopes: string[]
  reauthRequired: boolean
}

export interface GoogleSyncResult {
  eventId: string
  synced: boolean
  googleEventId?: string
  htmlLink?: string | null
  errorCode?: string
  message?: string
}

export interface BatchSyncResult {
  results: GoogleSyncResult[]
  syncedCount: number
  failedCount: number
}

export const DISCONNECTED_GOOGLE_STATUS: GoogleConnectionStatus = {
  connected: false,
  email: null,
  connectedAt: null,
  scopes: [],
  reauthRequired: false,
}
