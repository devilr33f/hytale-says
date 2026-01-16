import { Hono } from 'hono'
import type { StateStore } from '../../core/state-store.js'
import type { TokenManager } from '../../core/token-manager.js'
import type { ApiContext } from '../../types.js'

export function createVersionRoutes(stateStore: StateStore, tokenManager: TokenManager) {
  const router = new Hono<{ Variables: { apiContext: ApiContext } }>()

  router.get('/launcher', async (c) => {
    const data = stateStore.get('hytale-launcher')
    if (!data) {
      return c.json({ error: 'No launcher data available' }, 404)
    }
    return c.json(data)
  })

  router.get('/downloader', async (c) => {
    const data = stateStore.get('hytale-downloader')
    if (!data) {
      return c.json({ error: 'No downloader data available' }, 404)
    }
    return c.json(data)
  })

  router.get('/patches', async (c) => {
    const data = stateStore.get('hytale-patches')
    if (!data) {
      return c.json({ error: 'No patches data available' }, 404)
    }
    return c.json(data)
  })

  router.get('/server', async (c) => {
    try {
      const serverData = stateStore.get('hytale-server')
      if (!serverData) {
        return c.json({ error: 'No server data available' }, 404)
      }

      const serverObj = serverData as Record<string, { version: string; lastCheck: number }>
      const result: Record<string, { version: string; download_url: string; sha256?: string; url: string }> = {}

      const token = await tokenManager.getAccessToken('downloader')

      for (const [patchline, data] of Object.entries(serverObj)) {
        try {
          const response = await fetch(
            `https://account-data.hytale.com/game-assets/version/${patchline}.json`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          )

          if (!response.ok) {
            console.warn(`[API] Failed to fetch signed URL for ${patchline}: ${response.statusText}`)
            continue
          }

          const signedUrlData = await response.json() as { url: string }

          // Fetch version data from signed URL
          let versionData: { version?: string; download_url?: string; sha256?: string } = {}
          try {
            const versionResponse = await fetch(signedUrlData.url)
            if (versionResponse.ok) {
              versionData = await versionResponse.json()
            }
          }
          catch (err) {
            console.warn(`[API] Error fetching version data from signed URL for ${patchline}:`, err)
          }

          result[patchline] = {
            version: versionData.version || data.version,
            download_url: versionData.download_url || '',
            sha256: versionData.sha256,
            url: signedUrlData.url,
          }
        }
        catch (err) {
          console.warn(`[API] Error fetching signed URL for ${patchline}:`, err)
        }
      }

      if (Object.keys(result).length === 0) {
        return c.json({ error: 'Failed to fetch signed URLs' }, 500)
      }

      return c.json(result)
    }
    catch (err) {
      console.error('[API] Error in /server endpoint:', err)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })

  return router
}
