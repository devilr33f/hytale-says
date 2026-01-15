import type { LauncherUpdate } from './tracker.js'

function formatDownloadUrls(downloadUrl: Record<string, Record<string, { url: string, sha256: string }>>): string {
  const lines: string[] = []

  for (const [os, architectures] of Object.entries(downloadUrl)) {
    for (const [arch, data] of Object.entries(architectures)) {
      if (data.url && data.sha256) {
        lines.push(`  • ${os}/${arch}: <a href="${data.url}">Download</a> (SHA256: <code>${data.sha256.slice(0, 16)}...</code>)`)
      }
      else if (data.url) {
        lines.push(`  • ${os}/${arch}: <a href="${data.url}">Download</a>`)
      }
    }
  }

  return lines.length > 0 ? `\n<b>Downloads:</b>\n${lines.join('\n')}` : ''
}

export function formatLauncherUpdate(update: LauncherUpdate): string {
  const { version, previousVersion, downloadUrl } = update

  let message = `<b>🚀 Hytale Launcher Update</b>

<b>New version:</b> <code>${version}</code>
${previousVersion !== 'unknown' ? `<b>Previous:</b> <code>${previousVersion}</code>` : ''}`

  if (downloadUrl && Object.keys(downloadUrl).length > 0) {
    message += formatDownloadUrls(downloadUrl)
  }

  return message
}
