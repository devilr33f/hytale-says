export interface RoleConfig {
  id: string
  name: string
  topicId: number
}

export interface ServerConfig {
  name: string
  guildId: string
  roles: RoleConfig[]
}

export interface Config {
  telegram: {
    chatId: string
  }
  servers: ServerConfig[]
}

export interface ForwardMessageOptions {
  topicId: number
  author: string
  role: string
  channel: string
  content: string
  attachments: AttachmentInfo[]
  messageLink: string
}

export interface AttachmentInfo {
  url: string
  name: string
  contentType: string | null
}
