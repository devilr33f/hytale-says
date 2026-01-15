import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'

export interface TokenConfig {
  clientId: string
  tokenEndpoint: string
  tokenFile: string
}

export interface TokenData {
  access_token: string
  refresh_token: string
  expires_at: number
  scope?: string
}

const REFRESH_BUFFER_SECONDS = 300

export class TokenManager {
  private configs = new Map<string, TokenConfig>()
  private tokens = new Map<string, TokenData>()
  private refreshTimers = new Map<string, NodeJS.Timeout>()

  register(key: string, config: TokenConfig): void {
    this.configs.set(key, config)
  }

  async getAccessToken(key: string): Promise<string> {
    const config = this.configs.get(key)
    if (!config) {
      throw new Error(`Token config not registered: ${key}`)
    }

    let tokenData = this.tokens.get(key)

    if (!tokenData) {
      tokenData = await this.loadTokens(key, config.tokenFile)
      if (!tokenData) {
        throw new Error(`No token data found for ${key}, please set up tokens/${key}.json`)
      }
      this.tokens.set(key, tokenData)
    }

    if (this.needsRefresh(tokenData.expires_at)) {
      await this.refreshToken(key)
      tokenData = this.tokens.get(key)!
    }

    this.scheduleRefresh(key, tokenData)

    return tokenData.access_token
  }

  private needsRefresh(expiresAt: number): boolean {
    return Date.now() >= (expiresAt - REFRESH_BUFFER_SECONDS * 1000)
  }

  private async loadTokens(key: string, tokenFile: string): Promise<TokenData | undefined> {
    try {
      const content = await fs.readFile(tokenFile, 'utf-8')
      const data = JSON.parse(content)

      let expiresAt: number
      if (data.expires_at) {
        expiresAt = data.expires_at
      }
      else {
        // Decode JWT to get actual expiry from 'exp' claim
        const parts = data.access_token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          expiresAt = payload.exp * 1000
        }
        else {
          expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000
        }
      }

      const tokens: TokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
        scope: data.scope,
      }

      this.tokens.set(key, tokens)
      // Save back with expires_at for future loads
      await this.saveTokens(key)
      return tokens
    }
    catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined
      }
      throw err
    }
  }

  private async saveTokens(key: string): Promise<void> {
    const config = this.configs.get(key)
    const tokenData = this.tokens.get(key)
    if (!config || !tokenData) {
      return
    }

    const dir = path.dirname(config.tokenFile)
    await fs.mkdir(dir, { recursive: true })

    const data = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      scope: tokenData.scope,
    }

    await fs.writeFile(config.tokenFile, JSON.stringify(data, null, 2))
  }

  private async refreshToken(key: string): Promise<void> {
    const config = this.configs.get(key)
    const tokenData = this.tokens.get(key)
    if (!config || !tokenData) {
      throw new Error(`Cannot refresh ${key}: missing config or token data`)
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token,
      client_id: config.clientId,
    })

    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed for ${key}: ${response.statusText}`)
    }

    const data = await response.json() as TokenData & { expires_in?: number }

    const newTokens: TokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? tokenData.refresh_token,
      expires_at: data.expires_at ?? (Date.now() + (data.expires_in ?? 3600) * 1000),
      scope: data.scope,
    }

    this.tokens.set(key, newTokens)
    await this.saveTokens(key)
  }

  private scheduleRefresh(key: string, tokenData: TokenData): void {
    const existing = this.refreshTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    const timeUntilRefresh = Math.max(0, tokenData.expires_at - Date.now() - REFRESH_BUFFER_SECONDS * 1000)

    const timer = setTimeout(() => {
      this.refreshToken(key).catch((err) => {
        console.error(`[TokenManager] Auto-refresh failed for ${key}:`, err)
      })
    }, timeUntilRefresh)

    this.refreshTimers.set(key, timer)
  }

  stopAll(): void {
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer)
    }
    this.refreshTimers.clear()
  }
}
