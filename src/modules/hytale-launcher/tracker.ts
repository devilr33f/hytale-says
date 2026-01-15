import type { StateStore } from '../../core/state-store.js'

interface LauncherResponse {
  version: string
  download_url: Record<string, Record<string, { url: string, sha256: string }>>
}

export interface LauncherUpdate {
  version: string
  previousVersion: string
  downloadUrl: Record<string, Record<string, { url: string, sha256: string }>>
}

const ENDPOINT = 'https://launcher.hytale.com/version/release/launcher.json'
const STATE_KEY = 'hytale-launcher'

export async function checkLauncherUpdate(stateStore: StateStore): Promise<LauncherUpdate | null> {
  const response = await fetch(ENDPOINT)
  if (!response.ok) {
    throw new Error(`Launcher endpoint returned ${response.status}`)
  }

  const data = await response.json() as LauncherResponse
  const currentVersion = data.version

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
    downloadUrl: data.download_url,
  }
}
