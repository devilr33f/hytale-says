import type { BlogPost } from '../hytale-blog/tracker.js'
import type { DownloaderUpdate } from '../hytale-downloader/tracker.js'
import type { LauncherUpdate } from '../hytale-launcher/tracker.js'
import type { PatchesUpdate } from '../hytale-patches/tracker.js'
import type { PresskitUpdate } from '../hytale-presskit/tracker.js'
import type { ServerUpdate } from '../hytale-server/tracker.js'
import type { DiscordEmbed } from './types.js'
import { getBlogUrl, getThumbnailUrl } from '../hytale-blog/tracker.js'

const HYTALE_ORANGE = 0xF26430
const HYTALE_LOGO = 'https://hytale.com/favicon.ico'

export function formatLauncherEmbed(update: LauncherUpdate): DiscordEmbed {
  return {
    title: 'Launcher Update',
    description: `New launcher version available`,
    color: HYTALE_ORANGE,
    fields: [
      { name: 'Version', value: `\`${update.version}\``, inline: true },
      { name: 'Previous', value: `\`${update.previousVersion}\``, inline: true },
    ],
    thumbnail: { url: HYTALE_LOGO },
    timestamp: new Date().toISOString(),
  }
}

export function formatPatchesEmbed(update: PatchesUpdate): DiscordEmbed {
  const fields = [
    { name: 'Patchline', value: `\`${update.patchline}\``, inline: true },
    { name: 'Version', value: `\`${update.version}\``, inline: true },
    { name: 'Previous', value: `\`${update.previousVersion}\``, inline: true },
    { name: 'Patch ID', value: `\`${update.patchId}\``, inline: true },
  ]

  if (update.patchSize !== undefined) {
    fields.push({ name: 'Patch Size', value: formatBytes(update.patchSize), inline: true })
  }

  return {
    title: 'Game Patches Update',
    description: `New game patch available for ${update.patchline}`,
    color: HYTALE_ORANGE,
    fields,
    thumbnail: { url: HYTALE_LOGO },
    timestamp: new Date().toISOString(),
  }
}

export function formatServerEmbed(update: ServerUpdate): DiscordEmbed {
  return {
    title: 'Server Software Update',
    description: `New server version for ${update.patchline}`,
    color: HYTALE_ORANGE,
    fields: [
      { name: 'Patchline', value: `\`${update.patchline}\``, inline: true },
      { name: 'Version', value: `\`${update.version}\``, inline: true },
      { name: 'Previous', value: `\`${update.previousVersion}\``, inline: true },
    ],
    thumbnail: { url: HYTALE_LOGO },
    timestamp: new Date().toISOString(),
  }
}

export function formatDownloaderEmbed(update: DownloaderUpdate): DiscordEmbed {
  return {
    title: 'Downloader Update',
    description: `New downloader version available`,
    color: HYTALE_ORANGE,
    fields: [
      { name: 'Version', value: `\`${update.version}\``, inline: true },
      { name: 'Previous', value: `\`${update.previousVersion}\``, inline: true },
    ],
    thumbnail: { url: HYTALE_LOGO },
    timestamp: new Date().toISOString(),
  }
}

export function formatPresskitEmbed(update: PresskitUpdate): DiscordEmbed {
  const fields = [
    { name: 'Size', value: formatBytes(update.size), inline: true },
  ]

  if (update.previousSize !== null) {
    fields.push({ name: 'Previous', value: formatBytes(update.previousSize), inline: true })
    const sign = update.sizeDiff >= 0 ? '+' : ''
    fields.push({ name: 'Change', value: `${sign}${formatBytes(update.sizeDiff)}`, inline: true })
  }

  return {
    title: 'Creator Presskit Update',
    description: `Presskit archive has been updated`,
    color: HYTALE_ORANGE,
    fields,
    thumbnail: { url: HYTALE_LOGO },
    timestamp: new Date().toISOString(),
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const absBytes = Math.abs(bytes)
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(absBytes) / Math.log(k))
  const value = absBytes / k ** i
  const sign = bytes < 0 ? '-' : ''
  return `${sign}${value.toFixed(i > 0 ? 2 : 0)} ${sizes[i]}`
}

export function formatBlogEmbed(post: BlogPost): DiscordEmbed {
  const url = getBlogUrl(post)
  const imageUrl = getThumbnailUrl(post)

  const embed: DiscordEmbed = {
    title: post.title,
    description: `*by **${post.author}***\n\n[Read the full post](${url})`,
    color: HYTALE_ORANGE,
  }

  if (imageUrl) {
    embed.image = { url: imageUrl }
  }

  return embed
}
