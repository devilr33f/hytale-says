import type { PresskitUpdate } from './tracker.js'

function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function formatPresskitUpdate(update: PresskitUpdate): string {
  const { size, previousSize, sizeDiff, date } = update

  let message = `<b>📦 Hytale Creator Presskit Update</b>

<b>New size:</b> <code>${formatBytes(size)}</code>`

  if (previousSize !== null) {
    const diffStr = sizeDiff > 0 ? `+${formatBytes(sizeDiff)}` : formatBytes(sizeDiff)
    const diffSign = sizeDiff > 0 ? '📈' : '📉'
    message += `
<b>Previous size:</b> <code>${formatBytes(previousSize)}</code>
<b>Difference:</b> <code>${diffStr}</code> ${diffSign}`
  }

  message += `
<b>Date:</b> <code>${date}</code>`

  return message
}
