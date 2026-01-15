import type { PatchesUpdate } from './tracker.js'

export function formatPatchesUpdate(update: PatchesUpdate): string {
  const { patchline, version, previousVersion, patchId } = update
  const emoji = patchline === 'release' ? '🎮' : '🧪'

  return `<b>${emoji} Hytale Game Patch Update</b>

<b>Patchline:</b> <code>${patchline}</code>
<b>New version:</b> <code>${version}</code>
${previousVersion !== 'unknown' ? `<b>Previous:</b> <code>${previousVersion}</code>` : ''}
${patchId ? `<b>Patch ID:</b> <code>${patchId}</code>` : ''}`
}
