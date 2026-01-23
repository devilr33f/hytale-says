import type { Module, ModuleDependencies } from '../../core/module.js'
import type { DiscordEmbed, DiscordWebhooksConfig } from './types.js'
import { sendWebhook } from './sender.js'

export interface DiscordWebhooksModule extends Module {
  send: (eventType: string, embed: DiscordEmbed) => Promise<void>
}

interface QueuedMessage {
  eventType: string
  embed: DiscordEmbed
}

export function discordWebhooksFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
): DiscordWebhooksModule {
  const config = moduleConfig as DiscordWebhooksConfig

  class DiscordWebhooksModuleImpl implements DiscordWebhooksModule {
    readonly name = 'discord-webhooks'
    private dependencies: ModuleDependencies
    private config: DiscordWebhooksConfig
    private running = false
    private queue: QueuedMessage[] = []
    private flushTimer: NodeJS.Timeout | null = null
    private batchDelayMs: number

    constructor(cfg: DiscordWebhooksConfig, deps: ModuleDependencies) {
      this.config = cfg
      this.dependencies = deps
      this.batchDelayMs = cfg.batchDelayMs ?? 100
    }

    isRunning(): boolean {
      return this.running
    }

    async start(): Promise<void> {
      if (this.running)
        return

      this.dependencies.logger(this.name, `Starting with ${this.config.webhooks.length} webhook(s)`)
      this.running = true
    }

    async stop(): Promise<void> {
      if (!this.running)
        return

      // Flush any pending messages
      if (this.flushTimer) {
        clearTimeout(this.flushTimer)
        this.flushTimer = null
      }
      if (this.queue.length > 0) {
        await this.flush()
      }

      this.running = false
    }

    async send(eventType: string, embed: DiscordEmbed): Promise<void> {
      if (!this.running)
        return

      this.queue.push({ eventType, embed })

      // Schedule flush if not already scheduled
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null
          this.flush().catch((err) => {
            this.dependencies.logger(this.name, `Flush failed: ${err}`)
          })
        }, this.batchDelayMs)
      }
    }

    private async flush(): Promise<void> {
      if (this.queue.length === 0)
        return

      const messages = [...this.queue]
      this.queue = []

      // Group messages by webhook based on event filtering
      for (const webhook of this.config.webhooks) {
        const relevantEmbeds = messages
          .filter(m => webhook.events.includes('*') || webhook.events.includes(m.eventType))
          .map(m => m.embed)

        if (relevantEmbeds.length === 0)
          continue

        try {
          await sendWebhook(webhook.url, relevantEmbeds)
          this.dependencies.logger(this.name, `Sent ${relevantEmbeds.length} embed(s) to ${webhook.name}`)
        }
        catch (err) {
          this.dependencies.logger(this.name, `Failed to send to ${webhook.name}: ${err}`)
        }
      }
    }
  }

  return new DiscordWebhooksModuleImpl(config, deps)
}
