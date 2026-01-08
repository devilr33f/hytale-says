import type { Message } from 'discord.js-selfbot-v13'
import type { AttachmentInfo, RoleConfig } from '../types.js'
import { config } from '../config.js'
import { forwardMessage } from '../telegram/sender.js'
import { discord } from './client.js'

export function setupHandlers(): void {
  discord.on('messageCreate', handleMessage)
}

async function handleMessage(message: Message): Promise<void> {
  if (!message.guild || !message.member)
    return

  const serverConfig = config.servers.find((s: { guildId: string }) => s.guildId === message.guild!.id)
  if (!serverConfig)
    return

  const matchedRole = findHighestPriorityRole(message.member.roles.cache, serverConfig.roles)
  if (!matchedRole)
    return

  const attachments: AttachmentInfo[] = message.attachments.map(att => ({
    url: att.url,
    name: att.name ?? 'file',
    contentType: att.contentType,
  }))

  const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`

  try {
    await forwardMessage({
      topicId: matchedRole.topicId,
      author: message.author.displayName ?? message.author.username,
      role: matchedRole.name,
      channel: 'name' in message.channel ? (message.channel.name ?? 'unknown') : 'DM',
      content: message.content,
      attachments,
      messageLink,
    })
    console.log(`Forwarded message from ${message.author.tag} (${matchedRole.name}) in ${serverConfig.name}`)
  }
  catch (err) {
    console.error('Failed to forward message:', err)
  }
}

function findHighestPriorityRole(
  memberRoles: Map<string, unknown>,
  configRoles: RoleConfig[],
): RoleConfig | null {
  for (const role of configRoles) {
    if (memberRoles.has(role.id)) {
      return role
    }
  }
  return null
}
