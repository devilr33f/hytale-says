import type { ServerUpdate } from './tracker.js'

export function formatServerUpdate(update: ServerUpdate): string {
  const { patchline, version, previousVersion } = update
  const emoji = patchline === 'release' ? '🖥️' : '🧪'

  return `<b>${emoji} Hytale Server Software Update</b>

<b>Patchline:</b> <code>${patchline}</code>
<b>New version:</b> <code>${version}</code>
${previousVersion !== 'unknown' ? `<b>Previous:</b> <code>${previousVersion}</code>` : ''}`
}
