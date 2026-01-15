import type { TelegramClient } from '../../core/telegram-client.js'
import type { ForwardMessageOptions } from '../../types.js'
import { MediaUpload } from 'wrappergram'

export async function forwardMessage(opts: ForwardMessageOptions & { telegram: TelegramClient }): Promise<void> {
  const { telegram, topicId, chatId, author, role, channel, content, attachments, messageLink, replyTo } = opts

  let text = ''

  // Add reply context as blockquote if present
  if (replyTo) {
    text += `<blockquote><b>${escapeHtml(replyTo.author)}</b>\n${escapeHtml(replyTo.content) || '(no text)'}\n<a href="${replyTo.messageLink}">View original</a></blockquote>\n\n`
  }

  const roleText = role ? ` (${escapeHtml(role)})` : ''
  text += `<b>${escapeHtml(author)}</b>${roleText} in <code>#${escapeHtml(channel)}</code>\n${escapeHtml(content)}\n\n<a href="${messageLink}">Jump to message</a>`

  // Enable link preview only if content has URLs (not just the discord jump link)
  const hasLinks = /https?:\/\/\S+/i.test(content)

  await telegram.sendMessage({
    text,
    chatIds: [chatId],
    topicId,
    parseMode: 'HTML',
    disableLinkPreview: !hasLinks,
  })

  if (attachments.length === 0)
    return

  // Separate media (photos/videos) from documents
  const media = attachments.filter((att) => {
    const isImage = att.contentType?.startsWith('image/')
    const isVideo = att.contentType?.startsWith('video/')
    return isImage || isVideo
  })
  const documents = attachments.filter((att) => {
    const isImage = att.contentType?.startsWith('image/')
    const isVideo = att.contentType?.startsWith('video/')
    return !isImage && !isVideo
  })

  // Send media as group or single
  if (media.length > 1) {
    try {
      const mediaItems = await Promise.all(media.map(async (att) => {
        const file = await MediaUpload.url(att.url)
        return {
          type: att.contentType?.startsWith('video/') ? 'video' as const : 'photo' as const,
          media: file,
        }
      }))
      await telegram.api.sendMediaGroup({
        chat_id: chatId,
        message_thread_id: topicId,
        media: mediaItems,
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
          chat_id: chatId,
          video: await MediaUpload.url(att.url),
          message_thread_id: topicId,
        })
      }
      else {
        await telegram.api.sendPhoto({
          chat_id: chatId,
          photo: await MediaUpload.url(att.url),
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
        chat_id: chatId,
        document: await MediaUpload.url(att.url),
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
