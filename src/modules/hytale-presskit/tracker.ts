import type { StateStore } from '../../core/state-store.js'

export interface PresskitUpdate {
  size: number
  previousSize: number | null
  sizeDiff: number
  date: string
}

const ENDPOINT = 'https://cdn.hytale.com/CreatorPressKit.zip'
const STATE_KEY = 'hytale-presskit'

export async function checkPresskitUpdate(stateStore: StateStore): Promise<PresskitUpdate | null> {
  const response = await fetch(ENDPOINT, { method: 'HEAD' })
  if (!response.ok) {
    throw new Error(`Presskit endpoint returned ${response.status}`)
  }

  const contentLength = response.headers.get('content-length')
  const date = response.headers.get('date')

  if (!contentLength) {
    throw new Error('Content-Length header missing')
  }

  const size = parseInt(contentLength, 10)

  const state = stateStore.get<{ lastSize?: number, lastDate?: string }>(STATE_KEY)
  const lastSize = state?.lastSize ?? null

  if (lastSize === size) {
    // No update, just update check time
    stateStore.set(STATE_KEY, { lastSize: size, lastDate: date || new Date().toISOString() })
    return null
  }

  // Update detected
  stateStore.set(STATE_KEY, { lastSize: size, lastDate: date || new Date().toISOString() })

  return {
    size,
    previousSize: lastSize,
    sizeDiff: lastSize !== null ? size - lastSize : 0,
    date: date || new Date().toISOString(),
  }
}
