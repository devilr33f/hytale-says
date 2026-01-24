import type { DiscordMessage, WebhookPayload } from './types.js'
import { isWebhookPayload } from './types.js'

const MAX_EMBEDS_PER_MESSAGE = 10

export async function sendWebhook(url: string, messages: DiscordMessage[], mentionRoles?: string[]): Promise<void> {
  // Separate full payloads (with components) from simple embeds
  const payloads: WebhookPayload[] = []
  const simpleEmbeds: WebhookPayload['embeds'] = []

  for (const msg of messages) {
    if (isWebhookPayload(msg)) {
      payloads.push(msg)
    }
    else {
      simpleEmbeds.push(msg)
    }
  }

  // Build role mentions content
  const roleContent = mentionRoles?.length
    ? mentionRoles.map(id => `<@&${id}>`).join(' ')
    : undefined
  const allowedMentions = mentionRoles?.length
    ? { roles: mentionRoles }
    : undefined

  // Send full payloads individually (they may have components)
  for (const payload of payloads) {
    const payloadWithMentions: WebhookPayload = {
      ...payload,
      content: roleContent ? `${roleContent}${payload.content ? `\n${payload.content}` : ''}` : payload.content,
      allowed_mentions: allowedMentions ?? payload.allowed_mentions,
    }
    await sendPayload(url, payloadWithMentions)
  }

  // Batch simple embeds (max 10 per message)
  for (let i = 0; i < simpleEmbeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
    const batch = simpleEmbeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE)
    await sendPayload(url, {
      content: roleContent,
      embeds: batch,
      allowed_mentions: allowedMentions,
    })
  }
}

async function sendPayload(url: string, payload: WebhookPayload, retries = 3): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (response.status === 429 && retries > 0) {
    const retryAfter = response.headers.get('retry-after')
    const delay = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 1000
    await sleep(delay)
    return sendPayload(url, payload, retries - 1)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Webhook failed with ${response.status}: ${text}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
