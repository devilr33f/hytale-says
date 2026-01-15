import type { DownloaderUpdate } from './tracker.js'

export function formatDownloaderUpdate(update: DownloaderUpdate): string {
  const { version, previousVersion } = update

  return `<b>📦 Hytale Downloader Update</b>

<b>New version:</b> <code>${version}</code>
${previousVersion !== 'unknown' ? `<b>Previous:</b> <code>${previousVersion}</code>` : ''}`
}
