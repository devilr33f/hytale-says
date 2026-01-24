import type { StateStore } from '../../core/state-store.js'

export interface BlogPost {
  _id: string
  title: string
  author: string
  slug: string
  publishedAt: string
  createdAt: string
  coverImage?: {
    variants: string[]
    s3Key: string
  }
  bodyExcerpt: string
}

interface BlogState {
  seenIds: string[]
  lastCheck: string
}

const ENDPOINT = 'https://hytale.com/api/blog/post/published'
const STATE_KEY = 'hytale-blog'
const MAX_SEEN_IDS = 100

export async function checkBlogUpdates(stateStore: StateStore): Promise<BlogPost[]> {
  const response = await fetch(ENDPOINT)
  if (!response.ok) {
    throw new Error(`Blog endpoint returned ${response.status}`)
  }

  const posts = await response.json() as BlogPost[]
  const state = stateStore.get<BlogState>(STATE_KEY)
  const seenIds = new Set(state?.seenIds ?? [])

  // First run: mark all current posts as seen, don't notify
  if (!state) {
    const allIds = posts.map(p => p._id).slice(0, MAX_SEEN_IDS)
    stateStore.set(STATE_KEY, { seenIds: allIds, lastCheck: new Date().toISOString() })
    return []
  }

  // Find new posts
  const newPosts = posts.filter(p => !seenIds.has(p._id))

  if (newPosts.length > 0) {
    // Add new IDs to seen list, keep bounded
    const updatedIds = [...newPosts.map(p => p._id), ...state.seenIds].slice(0, MAX_SEEN_IDS)
    stateStore.set(STATE_KEY, { seenIds: updatedIds, lastCheck: new Date().toISOString() })
  }
  else {
    // Just update check time
    stateStore.set(STATE_KEY, { ...state, lastCheck: new Date().toISOString() })
  }

  return newPosts
}

export function getBlogUrl(post: BlogPost): string {
  const date = new Date(post.publishedAt)
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  return `https://hytale.com/news/${year}/${month}/${post.slug}`
}

export function getThumbnailUrl(post: BlogPost): string | undefined {
  if (!post.coverImage?.variants?.length || !post.coverImage.s3Key) {
    return undefined
  }
  const variant = post.coverImage.variants.at(-1)
  return `https://cdn.hytale.com/variants/${variant}_${post.coverImage.s3Key}`
}
