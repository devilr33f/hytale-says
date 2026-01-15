import type { StateStore } from '../../core/state-store.js'

interface DownloaderResponse {
  latest: string
}

export interface DownloaderUpdate {
  version: string
  previousVersion: string
}

const ENDPOINT = 'https://downloader.hytale.com/version.json'
const STATE_KEY = 'hytale-downloader'

export async function checkDownloaderUpdate(stateStore: StateStore): Promise<DownloaderUpdate | null> {
  const response = await fetch(ENDPOINT)
  if (!response.ok) {
    throw new Error(`Downloader endpoint returned ${response.status}`)
  }

  const data = await response.json() as DownloaderResponse
  const currentVersion = data.latest

  const state = stateStore.get<{ lastVersion?: string, lastCheck?: string }>(STATE_KEY)
  const lastVersion = state?.lastVersion

  if (lastVersion === currentVersion) {
    // No update, just update check time
    stateStore.set(STATE_KEY, { lastVersion: currentVersion, lastCheck: new Date().toISOString() })
    return null
  }

  // Update detected
  stateStore.set(STATE_KEY, { lastVersion: currentVersion, lastCheck: new Date().toISOString() })

  return {
    version: currentVersion,
    previousVersion: lastVersion ?? 'unknown',
  }
}
