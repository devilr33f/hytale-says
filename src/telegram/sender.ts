import type { ForwardMessageOptions } from '../types.js'
import { Buffer } from 'node:buffer'
import { MediaUpload } from 'wrappergram'
import { config } from '../config.js'
import { telegram } from './client.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB Telegram limit

interface DownloadedAttachment {
  buffer: Buffer
  name: string
  contentType: string | null
}

export async function forwardMessage(opts: ForwardMessageOptions): Promise<void> {
  const { topicId, author, role, channel, content, attachments, messageLink } = opts

  const roleText = role ? ` (${escapeHtml(role)})` : ''
  const text = `<b>${escapeHtml(author)}</b>${roleText} in <code>#${escapeHtml(channel)}</code>\n${escapeHtml(content)}\n\n<a href="${messageLink}">Jump to message</a>`

  await telegram.api.sendMessage({
    chat_id: config.telegram.chatId,
    text,
    message_thread_id: topicId,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  })

  if (attachments.length === 0)
    return

  // Download all attachments first
  const downloaded: DownloadedAttachment[] = []
  for (const att of attachments) {
    try {
      const response = await fetch(att.url)
      const buffer = Buffer.from(await response.arrayBuffer())

      if (buffer.length > MAX_FILE_SIZE) {
        console.warn(`Skipping attachment ${att.name}: exceeds 50MB limit`)
        continue
      }

      downloaded.push({ buffer, name: att.name, contentType: att.contentType })
    }
    catch (err) {
      console.error(`Failed to download attachment ${att.name}:`, err)
    }
  }

  if (downloaded.length === 0)
    return

  // Separate media (photos/videos) from documents
  const media: DownloadedAttachment[] = []
  const documents: DownloadedAttachment[] = []

  for (const att of downloaded) {
    const isImage = att.contentType?.startsWith('image/')
    const isVideo = att.contentType?.startsWith('video/')

    if (isImage || isVideo) {
      media.push(att)
    }
    else {
      documents.push(att)
    }
  }

  // Send media as group or single
  if (media.length > 1) {
    try {
      await telegram.api.sendMediaGroup({
        chat_id: config.telegram.chatId,
        message_thread_id: topicId,
        media: media.map(att => ({
          type: att.contentType?.startsWith('video/') ? 'video' : 'photo',
          media: MediaUpload.buffer(att.buffer, att.name),
        })),
      })
    }
    catch (err) {
      console.error('Failed to send media group:', err)
    }
  }
  else if (media.length === 1) {
    const att = media[0]
    try {
      if (att.contentType?.startsWith('video/')) {
        await telegram.api.sendVideo({
          chat_id: config.telegram.chatId,
          video: MediaUpload.buffer(att.buffer, att.name),
          message_thread_id: topicId,
        })
      }
      else {
        await telegram.api.sendPhoto({
          chat_id: config.telegram.chatId,
          photo: MediaUpload.buffer(att.buffer, att.name),
          message_thread_id: topicId,
        })
      }
    }
    catch (err) {
      console.error(`Failed to send ${att.contentType?.startsWith('video/') ? 'video' : 'photo'}:`, err)
    }
  }

  // Send documents separately
  for (const att of documents) {
    try {
      await telegram.api.sendDocument({
        chat_id: config.telegram.chatId,
        document: MediaUpload.buffer(att.buffer, att.name),
        message_thread_id: topicId,
      })
    }
    catch (err) {
      console.error(`Failed to send document ${att.name}:`, err)
    }
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
