import type { Config } from './types.js'
import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

const CONFIG_PATH = './config.json'

interface LegacyConfig {
  telegram: { chatId: string }
  servers: Array<{
    name: string
    guildId: string
    roles?: Array<{ id: string, name: string, topicId: number }>
    channels?: Array<{ id: string, name: string, topicId: number }>
  }>
  ignoredUserIds?: string[]
}

function isLegacyConfig(config: unknown): config is LegacyConfig {
  const c = config as Record<string, unknown>
  return !('modules' in c) && 'servers' in c
}

function migrateLegacyConfig(legacy: LegacyConfig): Config {
  return {
    telegram: { botToken: process.env.TELEGRAM_BOT_TOKEN ?? '' },
    modules: {
      'discord-forwarder': {
        enabled: true,
        ignoredUserIds: legacy.ignoredUserIds ?? [],
        chatId: legacy.telegram.chatId,
        discordToken: process.env.DISCORD_TOKEN ?? '',
        servers: legacy.servers,
      },
    },
  }
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found: ${CONFIG_PATH}`)
  }

  const raw = readFileSync(CONFIG_PATH, 'utf-8')
  const parsed = JSON.parse(raw)

  if (isLegacyConfig(parsed)) {
    console.log('[Config] Migrating legacy config to new format')
    return migrateLegacyConfig(parsed)
  }

  const config = parsed as Config

  if (!config.telegram?.botToken) {
    config.telegram = { botToken: process.env.TELEGRAM_BOT_TOKEN ?? '' }
    if (!config.telegram.botToken) {
      throw new Error('Config missing telegram.botToken (set in config.json or TELEGRAM_BOT_TOKEN env var)')
    }
  }

  if (!config.modules || typeof config.modules !== 'object') {
    throw new Error('Config missing modules object')
  }

  for (const [moduleName, moduleConfig] of Object.entries(config.modules)) {
    if (!moduleConfig || typeof moduleConfig !== 'object') {
      throw new Error(`Invalid module config: ${moduleName}`)
    }

    const mc = moduleConfig as Record<string, unknown>

    if (typeof mc.enabled !== 'boolean') {
      throw new TypeError(`Module ${moduleName} missing enabled field`)
    }

    if (moduleName === 'discord-forwarder') {
      if (typeof mc.chatId !== 'string') {
        throw new TypeError(`discord-forwarder missing chatId`)
      }
      if (typeof mc.discordToken !== 'string') {
        throw new TypeError(`discord-forwarder missing discordToken`)
      }
      if (!mc.discordToken) {
        mc.discordToken = process.env.DISCORD_TOKEN ?? ''
        if (!mc.discordToken) {
          throw new Error('discord-forwarder missing discordToken (set in config.json or DISCORD_TOKEN env var)')
        }
      }
      if (!Array.isArray(mc.servers)) {
        throw new TypeError(`discord-forwarder missing servers array`)
      }
      for (const server of mc.servers as Array<{ guildId?: string }>) {
        if (!server.guildId) {
          throw new Error(`discord-forwarder server missing guildId`)
        }
      }
    }

    if (moduleName.startsWith('hytale-')) {
      if (typeof mc.pollIntervalMinutes !== 'number') {
        throw new TypeError(`${moduleName} missing pollIntervalMinutes`)
      }
      if (!Array.isArray(mc.chatIds)) {
        throw new TypeError(`${moduleName} missing chatIds array`)
      }
    }

    if (moduleName === 'discord-webhooks') {
      if (!Array.isArray(mc.webhooks)) {
        throw new TypeError(`discord-webhooks missing webhooks array`)
      }
      for (const webhook of mc.webhooks as Array<{ name?: string, url?: string, events?: string[] }>) {
        if (typeof webhook.name !== 'string') {
          throw new TypeError(`discord-webhooks webhook missing name`)
        }
        if (typeof webhook.url !== 'string') {
          throw new TypeError(`discord-webhooks webhook missing url`)
        }
        if (!Array.isArray(webhook.events)) {
          throw new TypeError(`discord-webhooks webhook ${webhook.name} missing events array`)
        }
      }
    }
  }

  return config
}

export const config = loadConfig()
