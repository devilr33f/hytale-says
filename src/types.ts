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

export interface Config {
  telegram: {
    chatId: string
  }
  servers: ServerConfig[]
}

export interface ForwardMessageOptions {
  topicId: number
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
