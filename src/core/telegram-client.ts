import type { ChatDestination } from '../types.js'
import { Telegram } from 'wrappergram'

export interface SendMessageOptions {
  text: string
  chatIds: (string | ChatDestination)[]
  topicId?: number
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML'
  disableLinkPreview?: boolean
}

export class TelegramClient {
  private client: Telegram

  constructor(token: string) {
    this.client = new Telegram(token)
  }

  get api() {
    return this.client.api
  }

  async sendMessage(opts: SendMessageOptions): Promise<void> {
    const { text, chatIds, topicId, parseMode = 'HTML', disableLinkPreview = false } = opts

    await Promise.all(chatIds.map((dest) => {
      const chatId = typeof dest === 'string' ? dest : dest.chatId
      const threadId = typeof dest === 'string' ? topicId : dest.topicId

      return this.client.api.sendMessage({
        chat_id: chatId,
        text,
        message_thread_id: threadId,
        parse_mode: parseMode,
        link_preview_options: { is_disabled: disableLinkPreview },
      })
    }))
  }

  destroy(): void {
    // Wrappergram handles cleanup automatically
  }
}
