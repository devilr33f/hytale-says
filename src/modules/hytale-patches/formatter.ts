import type { PatchesUpdate } from './tracker.js'

function formatBytes(bytes: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function formatPatchesUpdate(update: PatchesUpdate): string {
  const { patchline, version, previousVersion, patchId, patchSize } = update
  const emoji = patchline === 'release' ? '🎮' : '🧪'

  return `<b>${emoji} Hytale Game Patch Update</b>

<b>Patchline:</b> <code>${patchline}</code>
<b>New version:</b> <code>${version}</code>
${previousVersion !== 'unknown' ? `<b>Previous:</b> <code>${previousVersion}</code>` : ''}
${patchId ? `<b>Patch ID:</b> <code>${patchId}</code>` : ''}
${patchSize ? `<b>Size:</b> ~<code>${formatBytes(patchSize)}</code>` : ''}`
}
