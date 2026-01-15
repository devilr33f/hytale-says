import type { Client, Message } from 'discord.js-selfbot-v13'

import type { ModuleDependencies } from '../../core/module.js'
import type { AttachmentInfo, ChannelConfig, DiscordForwarderConfig, RoleConfig } from '../../types.js'

import { forwardMessage } from './sender.js'

interface MatchResult {
  topicId: number
  label: string
  type: 'channel' | 'role'
}

interface ReplyInfo {
  author: string
  content: string
  messageLink: string
}

export function setupHandlers(
  discord: Client,
  config: DiscordForwarderConfig,
  deps: ModuleDependencies,
): void {
  discord.on('messageCreate', message => handleMessage(message, config, deps))
}

async function handleMessage(
  message: Message,
  config: DiscordForwarderConfig,
  deps: ModuleDependencies,
): Promise<void> {
  if (!message.guild)
    return

  // Skip forwarded messages
  if ((message.reference as any)?.type === 'FORWARD')
    return

  if (config.ignoredUserIds?.includes(message.author.id))
    return

  const serverConfig = config.servers.find(s => s.guildId === message.guild!.id)
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

  // Fetch replied message if this is a reply
  let replyTo: ReplyInfo | undefined
  if (message.type === 'REPLY' && message.reference?.messageId) {
    try {
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId)
      replyTo = {
        author: repliedMessage.author.displayName ?? repliedMessage.author.username,
        content: repliedMessage.content,
        messageLink: `https://discord.com/channels/${message.reference.guildId}/${message.reference.channelId}/${message.reference.messageId}`,
      }
    }
    catch {
      // Replied message deleted or inaccessible
    }
  }

  try {
    await forwardMessage({
      telegram: deps.telegram,
      topicId: match.topicId,
      chatId: config.chatId,
      author: message.author.displayName ?? message.author.username,
      role: match.type === 'role' ? match.label : null,
      channel: channelName,
      content: message.content,
      attachments,
      messageLink,
      replyTo,
    })
    deps.logger('discord-forwarder', `Forwarded from ${message.author.tag} (${match.type}: ${match.label})`)
  }
  catch (err) {
    deps.logger('discord-forwarder', `Failed to forward: ${err}`)
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
