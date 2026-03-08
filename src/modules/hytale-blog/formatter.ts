import type { BlogPost } from './tracker.js'

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()
  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  return `${month} ${day}, ${year} ${hours}:${minutes} UTC`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function formatBlogUpdate(post: BlogPost): string {
  return `<b>📰 New Blog Post</b>

<b>${escapeHtml(post.title)}</b>

<b>Published:</b> ${formatDate(post.pubDate)}`
}
