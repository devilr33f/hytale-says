import type { StateStore } from '../../core/state-store.js'

interface VersionUrlResponse {
  url: string
}

interface VersionDataResponse {
  version: string
  download_url: string
  sha256: string
}

export interface ServerUpdate {
  patchline: string
  version: string
  previousVersion: string
}

const BASE_ENDPOINT = 'https://account-data.hytale.com/game-assets/version'
const STATE_KEY = 'hytale-server'

interface ServerState {
  [patchline: string]: {
    lastVersion: string
    lastCheck: string
  }
}

export async function checkServerUpdate(
  stateStore: StateStore,
  patchlines: string[],
  accessToken: string,
): Promise<ServerUpdate[]> {
  const state = stateStore.get<ServerState>(STATE_KEY) || {}
  const updates: ServerUpdate[] = []

  for (const patchline of patchlines) {
    let currentVersion: string

    try {
      // Step 1: Get signed URL
      const urlResponse = await fetch(`${BASE_ENDPOINT}/${patchline}.json`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!urlResponse.ok) {
        throw new Error(`Version URL endpoint returned ${urlResponse.status}`)
      }

      const urlData = await urlResponse.json() as VersionUrlResponse
      const signedUrl = urlData.url

      // Step 2: Fetch version data from signed URL
      const versionResponse = await fetch(signedUrl)
      if (!versionResponse.ok) {
        throw new Error(`Version data endpoint returned ${versionResponse.status}`)
      }

      const versionData = await versionResponse.json() as VersionDataResponse
      currentVersion = versionData.version
    }
    catch (err) {
      // Skip this patchline on error, continue with others
      console.error(`[hytale-server] Failed to check ${patchline}:`, err)
      continue
    }

    const lastState = state[patchline]

    if (lastState?.lastVersion === currentVersion) {
      // No update
      state[patchline] = { lastVersion: currentVersion, lastCheck: new Date().toISOString() }
      continue
    }

    // Update detected
    state[patchline] = { lastVersion: currentVersion, lastCheck: new Date().toISOString() }

    updates.push({
      patchline,
      version: currentVersion,
      previousVersion: lastState?.lastVersion ?? 'unknown',
    })
  }

  stateStore.set(STATE_KEY, state)
  return updates
}
