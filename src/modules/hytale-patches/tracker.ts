import type { StateStore } from '../../core/state-store.js'

export interface PatchesResponse {
  patchlines: {
    [key: string]: {
      buildVersion: string
      newest: number
    }
  }
}

export interface PatchesUpdate {
  patchline: string
  version: string
  previousVersion: string
  patchId: number
}

const ENDPOINT = 'https://account-data.hytale.com/my-account/get-launcher-data?arch=amd64&os=windows'
const STATE_KEY = 'hytale-patches'

export interface PatchesState {
  [patchline: string]: {
    lastVersion: string
    lastCheck: string
  }
}

export async function checkPatchesUpdate(
  stateStore: StateStore,
  patchlines: string[],
  accessToken: string,
): Promise<PatchesUpdate[]> {
  const response = await fetch(ENDPOINT, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'Hytale-Launcher/2.3.4586',
    },
  })

  if (!response.ok) {
    throw new Error(`Patches endpoint returned ${response.status}`)
  }

  const data = await response.json() as PatchesResponse
  const state = stateStore.get<PatchesState>(STATE_KEY) || {}
  const updates: PatchesUpdate[] = []

  for (const patchline of patchlines) {
    if (!(patchline in data.patchlines)) {
      continue
    }

    const currentVersion = data.patchlines[patchline].buildVersion
    const patchId = data.patchlines[patchline].newest
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
      patchId,
    })
  }

  stateStore.set(STATE_KEY, state)
  return updates
}
