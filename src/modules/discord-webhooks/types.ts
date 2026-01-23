import type { ModuleConfig } from '../../types.js'

export interface DiscordWebhooksConfig extends ModuleConfig {
  enabled: boolean
  webhooks: WebhookConfig[]
  batchDelayMs?: number
}

export interface WebhookConfig {
  name: string
  url: string
  events: string[]
}

export interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: EmbedField[]
  thumbnail?: { url: string }
  footer?: { text: string }
  timestamp?: string
}

export interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface WebhookPayload {
  embeds: DiscordEmbed[]
}
