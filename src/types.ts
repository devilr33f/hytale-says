export interface RoleConfig {
  id: string
  name: string
  topicId: number
}

export interface ChannelConfig {
  id: string
  name: string
  topicId: number
}

export interface ServerConfig {
  name: string
  guildId: string
  roles?: RoleConfig[]
  channels?: ChannelConfig[]
}

export interface ForwardMessageOptions {
  topicId: number
  chatId: string
  author: string
  role: string | null
  channel: string
  content: string
  attachments: AttachmentInfo[]
  messageLink: string
  replyTo?: {
    author: string
    content: string
    messageLink: string
  }
}

export interface AttachmentInfo {
  url: string
  name: string
  contentType: string | null
}

export interface Config {
  telegram: {
    botToken: string
  }
  modules: Record<string, ModuleConfig>
  hytaleAuth?: Record<string, {
    clientId: string
    tokenFile: string
    tokenEndpoint?: string
  }>
}

export interface ModuleConfig {
  enabled: boolean
  [key: string]: unknown
}

export interface DiscordForwarderConfig extends ModuleConfig {
  enabled: boolean
  ignoredUserIds: string[]
  chatId: string
  discordToken: string
  servers: ServerConfig[]
}

export interface ChatDestination {
  chatId: string
  topicId?: number
}

export interface HytaleTrackerConfig extends ModuleConfig {
  enabled: boolean
  pollIntervalMinutes: number
  chatIds: (string | ChatDestination)[]
}

export interface HytalePatchesConfig extends HytaleTrackerConfig {
  patchlines: string[]
}

export interface HytaleServerConfig extends HytaleTrackerConfig {
  patchlines: string[]
}

export interface ApiConfig extends ModuleConfig {
  enabled: boolean
  port: number
  jwtSecret: string
  accountUuid?: string
}

export interface JwtPayload {
  scope: string
  sub?: string
  iat?: number
  exp?: number
}

export interface ApiContext {
  scope: string
  sub?: string
}
