import { createMiddleware } from 'hono/factory'
import jwt from 'jsonwebtoken'
import type { JwtPayload, ApiContext } from '../types.js'

export function createJwtMiddleware(jwtSecret: string) {
  return createMiddleware<{ Variables: { apiContext: ApiContext } }>(async (c, next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401)
    }

    const token = authHeader.slice(7)

    try {
      const payload = jwt.verify(token, jwtSecret) as JwtPayload

      if (!payload.scope) {
        return c.json({ error: 'Token missing scope claim' }, 401)
      }

      c.set('apiContext', {
        scope: payload.scope,
        sub: payload.sub,
      })

      await next()
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401)
    }
  })
}

export function requireScope(...requiredScopes: string[]) {
  return createMiddleware<{ Variables: { apiContext: ApiContext } }>(async (c, next) => {
    const apiContext = c.get('apiContext')

    if (!apiContext) {
      return c.json({ error: 'No API context' }, 401)
    }

    const tokenScopes = apiContext.scope.split(' ')
    const hasRequiredScope = requiredScopes.some(
      scope => tokenScopes.includes(scope) || tokenScopes.includes('admin'),
    )

    if (!hasRequiredScope) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    await next()
  })
}
