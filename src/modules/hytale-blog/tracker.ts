import type { StateStore } from '../../core/state-store.js'

export interface BlogPost {
  title: string
  link: string
  guid: string
  description: string
  pubDate: string
}

interface BlogState {
  seenGuids: string[]
  lastCheck: string
}

const RSS_URL = 'https://hytale.com/rss.xml'
const STATE_KEY = 'hytale-blog'
const MAX_SEEN = 100

function parseItems(xml: string): BlogPost[] {
  const items: BlogPost[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g

  for (const match of xml.matchAll(itemRegex)) {
    const block = match[1]
    const tag = (name: string) =>
      block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1]?.trim() ?? ''

    items.push({
      title: unescape(tag('title')),
      link: tag('link'),
      guid: tag('guid'),
      description: unescape(tag('description')),
      pubDate: tag('pubDate'),
    })
  }

  return items
}

function unescape(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, '\'')
    .replace(/&quot;/g, '"')
}

export async function checkBlogUpdates(stateStore: StateStore): Promise<BlogPost[]> {
  const response = await fetch(RSS_URL, {
    headers: { 'user-agent': 'HytaleSays/1.0' },
  })
  if (!response.ok) {
    throw new Error(`rss feed returned ${response.status}`)
  }

  const xml = await response.text()
  const posts = parseItems(xml)
  const state = stateStore.get<BlogState>(STATE_KEY)
  const seenGuids = new Set(state?.seenGuids ?? [])

  if (!state) {
    const allGuids = posts.map(p => p.guid).slice(0, MAX_SEEN)
    stateStore.set(STATE_KEY, { seenGuids: allGuids, lastCheck: new Date().toISOString() })
    return []
  }

  const newPosts = posts.filter(p => !seenGuids.has(p.guid))

  if (newPosts.length > 0) {
    const updatedGuids = [...newPosts.map(p => p.guid), ...state.seenGuids].slice(0, MAX_SEEN)
    stateStore.set(STATE_KEY, { seenGuids: updatedGuids, lastCheck: new Date().toISOString() })
  }
  else {
    stateStore.set(STATE_KEY, { ...state, lastCheck: new Date().toISOString() })
  }

  return newPosts
}
