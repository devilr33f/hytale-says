import type { DiscordEmbed, WebhookPayload } from './types.js'

const MAX_EMBEDS_PER_MESSAGE = 10

export async function sendWebhook(url: string, embeds: DiscordEmbed[]): Promise<void> {
  // Discord allows max 10 embeds per message
  for (let i = 0; i < embeds.length; i += MAX_EMBEDS_PER_MESSAGE) {
    const batch = embeds.slice(i, i + MAX_EMBEDS_PER_MESSAGE)
    await sendBatch(url, batch)
  }
}

async function sendBatch(url: string, embeds: DiscordEmbed[], retries = 3): Promise<void> {
  const payload: WebhookPayload = { embeds }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (response.status === 429 && retries > 0) {
    const retryAfter = response.headers.get('retry-after')
    const delay = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : 1000
    await sleep(delay)
    return sendBatch(url, embeds, retries - 1)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Webhook failed with ${response.status}: ${text}`)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
