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
  mentionRoles?: string[]
}

export interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: EmbedField[]
  thumbnail?: { url: string }
  image?: { url: string }
  footer?: { text: string }
  timestamp?: string
}

export interface EmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface ButtonComponent {
  type: 2
  style: 5
  url: string
  label: string
}

export interface ActionRow {
  type: 1
  components: ButtonComponent[]
}

export interface WebhookPayload {
  content?: string | null
  embeds: DiscordEmbed[]
  components?: ActionRow[]
  allowed_mentions?: {
    roles?: string[]
  }
}

export type DiscordMessage = DiscordEmbed | WebhookPayload

export function isWebhookPayload(msg: DiscordMessage): msg is WebhookPayload {
  return 'embeds' in msg
}
