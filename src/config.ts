import type { Config } from './types.js'
import { existsSync, readFileSync } from 'node:fs'

const CONFIG_PATH = './config.json'

function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found: ${CONFIG_PATH}`)
  }

  const raw = readFileSync(CONFIG_PATH, 'utf-8')
  const config = JSON.parse(raw) as Config

  if (!config.telegram?.chatId) {
    throw new Error('Config missing telegram.chatId')
  }

  if (!Array.isArray(config.servers) || config.servers.length === 0) {
    throw new Error('Config missing servers array')
  }

  for (const server of config.servers) {
    if (!server.guildId) {
      throw new Error(`Server "${server.name}" missing guildId`)
    }

    const hasRoles = Array.isArray(server.roles) && server.roles.length > 0
    const hasChannels = Array.isArray(server.channels) && server.channels.length > 0

    if (!hasRoles && !hasChannels) {
      throw new Error(`Server "${server.name}" must have roles or channels configured`)
    }

    if (server.roles) {
      for (const role of server.roles) {
        if (!role.id || !role.name || typeof role.topicId !== 'number') {
          throw new Error(`Invalid role config in server "${server.name}"`)
        }
      }
    }

    if (server.channels) {
      for (const channel of server.channels) {
        if (!channel.id || !channel.name || typeof channel.topicId !== 'number') {
          throw new Error(`Invalid channel config in server "${server.name}"`)
        }
      }
    }
  }

  return config
}

export const config = loadConfig()
