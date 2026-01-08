import type { Message } from 'discord.js-selfbot-v13'
import type { AttachmentInfo, ChannelConfig, RoleConfig } from '../types.js'
import { config } from '../config.js'
import { forwardMessage } from '../telegram/sender.js'
import { discord } from './client.js'

export function setupHandlers(): void {
  discord.on('messageCreate', handleMessage)
}

interface MatchResult {
  topicId: number
  label: string
  type: 'channel' | 'role'
}

async function handleMessage(message: Message): Promise<void> {
  if (!message.guild)
    return

  const serverConfig = config.servers.find((s: { guildId: string }) => s.guildId === message.guild!.id)
  if (!serverConfig)
    return

  // Check channels first (higher priority), then roles
  let match: MatchResult | null = null

  if (serverConfig.channels) {
    const channelMatch = findMatchingChannel(message.channel.id, serverConfig.channels)
    if (channelMatch) {
      match = { topicId: channelMatch.topicId, label: channelMatch.name, type: 'channel' }
    }
  }

  if (!match && serverConfig.roles && message.member) {
    const roleMatch = findHighestPriorityRole(message.member.roles.cache, serverConfig.roles)
    if (roleMatch) {
      match = { topicId: roleMatch.topicId, label: roleMatch.name, type: 'role' }
    }
  }

  if (!match)
    return

  const attachments: AttachmentInfo[] = message.attachments.map(att => ({
    url: att.url,
    name: att.name ?? 'file',
    contentType: att.contentType,
  }))

  const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`
  const channelName = 'name' in message.channel ? (message.channel.name ?? 'unknown') : 'DM'

  try {
    await forwardMessage({
      topicId: match.topicId,
      author: message.author.displayName ?? message.author.username,
      role: match.type === 'role' ? match.label : null,
      channel: channelName,
      content: message.content,
      attachments,
      messageLink,
    })
    console.log(`Forwarded message from ${message.author.tag} (${match.type}: ${match.label}) in ${serverConfig.name}`)
  }
  catch (err) {
    console.error('Failed to forward message:', err)
  }
}

function findMatchingChannel(
  channelId: string,
  configChannels: ChannelConfig[],
): ChannelConfig | null {
  return configChannels.find(ch => ch.id === channelId) ?? null
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
