import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import type { StateStore } from '../core/state-store.js'
import type { TokenManager } from '../core/token-manager.js'
import type { ApiContext } from '../types.js'
import { createJwtMiddleware, requireScope } from './middleware.js'
import { createVersionRoutes } from './routes/versions.js'
import { createAccountRoutes } from './routes/accounts.js'

export interface ApiServerOptions {
  port: number
  jwtSecret: string
  stateStore: StateStore
  tokenManager: TokenManager
  accountUuid?: string
}

export async function startApiServer(options: ApiServerOptions): Promise<void> {
  const app = new Hono<{ Variables: { apiContext: ApiContext } }>()

  // Global JWT middleware
  app.use('*', createJwtMiddleware(options.jwtSecret))

  // Version routes (require launcher or downloader scope)
  const versionRoutes = createVersionRoutes(options.stateStore, options.tokenManager)
  app.use('/api/versions/launcher', requireScope('launcher'))
  app.use('/api/versions/downloader', requireScope('downloader'))
  app.use('/api/versions/patches', requireScope('launcher'))
  app.use('/api/versions/server', requireScope('downloader'))
  app.route('/api/versions', versionRoutes)

  // Account routes (require accounts scope)
  const accountRoutes = createAccountRoutes(options.tokenManager, options.accountUuid)
  app.use('/api/accounts/*', requireScope('accounts'))
  app.route('/api/accounts', accountRoutes)

  // Health check (no auth required, but we need to handle it before JWT middleware)
  app.get('/health', (c) => {
    return c.json({ status: 'ok' })
  })

  console.log(`[API] Starting server on port ${options.port}`)
  serve({
    fetch: app.fetch,
    port: options.port,
  })
}
