import { Hono } from 'hono'
import type { TokenManager } from '../../core/token-manager.js'
import type { ApiContext } from '../../types.js'

interface GameSessionResponse {
  expiresAt: string
  identityToken: string
  sessionToken: string
}

interface ProfileResponse {
  username: string
  uuid: string
  skin: string
  entitlements?: string[]
}

export function createAccountRoutes(tokenManager: TokenManager, accountUuid?: string) {
  const router = new Hono<{ Variables: { apiContext: ApiContext } }>()

  router.get('/profile/:identifier', async (c) => {
    try {
      if (!accountUuid) {
        return c.json({ error: 'Account UUID not configured' }, 500)
      }

      const identifier = c.req.param('identifier')

      // Parse identifier format: "uuid:UUID" or "username:USERNAME"
      const [type, value] = identifier.split(':')

      if (!type || !value) {
        return c.json({ error: 'Invalid identifier format. Use uuid:UUID or username:USERNAME' }, 400)
      }

      if (type !== 'uuid' && type !== 'username') {
        return c.json({ error: 'Invalid identifier type. Use uuid or username' }, 400)
      }

      // Get launcher token for creating game session
      const launcherToken = await tokenManager.getAccessToken('launcher')

      // Create game session using the configured account UUID
      const sessionResponse = await fetch('https://sessions.hytale.com/game-session/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${launcherToken}`,
        },
        body: JSON.stringify({ uuid: accountUuid }),
      })

      if (!sessionResponse.ok) {
        console.warn(`[API] Failed to create game session: ${sessionResponse.statusText}`)
        return c.json({ error: 'Failed to create game session' }, 500)
      }

      const sessionData = await sessionResponse.json() as GameSessionResponse
      const sessionToken = sessionData.sessionToken

      // Fetch profile using session token
      const profileUrl = type === 'uuid'
        ? `https://account-data.hytale.com/profile/uuid/${value}`
        : `https://account-data.hytale.com/profile/username/${value}`

      const profileResponse = await fetch(profileUrl, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      })

      if (!profileResponse.ok) {
        if (profileResponse.status === 404) {
          return c.json({ error: 'Profile not found' }, 404)
        }
        console.warn(`[API] Failed to fetch profile: ${profileResponse.statusText}`)
        return c.json({ error: 'Failed to fetch profile' }, 500)
      }

      const profile = await profileResponse.json() as ProfileResponse
      return c.json(profile)
    }
    catch (err) {
      console.error('[API] Error in /profile endpoint:', err)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })

  return router
}
