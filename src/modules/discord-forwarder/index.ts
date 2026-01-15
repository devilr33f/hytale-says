import type { Module, ModuleDependencies } from '../../core/module.js'
import type { DiscordForwarderConfig } from '../../types.js'
import { Client } from 'discord.js-selfbot-v13'
import { setupHandlers } from './handlers.js'

export function discordForwarderFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
): Module {
  const config = moduleConfig as DiscordForwarderConfig

  class DiscordForwarderModule implements Module {
    readonly name = 'discord-forwarder'
    private discord: Client
    private dependencies: ModuleDependencies
    private config: DiscordForwarderConfig
    private running = false

    constructor(cfg: DiscordForwarderConfig, deps: ModuleDependencies) {
      this.config = cfg
      this.dependencies = deps
      this.discord = new Client()
    }

    isRunning(): boolean {
      return this.running
    }

    async start(): Promise<void> {
      if (this.running)
        return

      await this.discord.login(this.config.discordToken)
      this.dependencies.logger(this.name, `Logged in as ${this.discord.user?.tag}`)
      this.dependencies.logger(this.name, `Tracking ${this.config.servers.length} server(s)`)

      setupHandlers(this.discord, this.config, this.dependencies)
      this.running = true
    }

    async stop(): Promise<void> {
      if (!this.running)
        return

      this.discord.destroy()
      this.running = false
    }
  }

  return new DiscordForwarderModule(config, deps)
}
