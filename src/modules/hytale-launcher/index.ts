import type { Module, ModuleDependencies } from '../../core/module.js'
import type { HytaleTrackerConfig } from '../../types.js'
import { formatLauncherEmbed } from '../discord-webhooks/formatter.js'
import { formatLauncherUpdate } from './formatter.js'
import { checkLauncherUpdate } from './tracker.js'

export function hytaleLauncherFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
): Module {
  const config = moduleConfig as HytaleTrackerConfig

  class HytaleLauncherModule implements Module {
    readonly name = 'hytale-launcher'
    private dependencies: ModuleDependencies
    private config: HytaleTrackerConfig
    private running = false
    private intervalId: NodeJS.Timeout | null = null

    constructor(cfg: HytaleTrackerConfig, deps: ModuleDependencies) {
      this.config = cfg
      this.dependencies = deps
    }

    isRunning(): boolean {
      return this.running
    }

    async start(): Promise<void> {
      if (this.running)
        return

      this.dependencies.logger(this.name, `Starting (poll interval: ${this.config.pollIntervalMinutes}min)`)

      // Initial check
      await this.check()

      // Start polling
      this.intervalId = setInterval(() => {
        this.check().catch((err) => {
          this.dependencies.logger(this.name, `Check failed: ${err}`)
        })
      }, this.config.pollIntervalMinutes * 60 * 1000)

      this.running = true
    }

    async stop(): Promise<void> {
      if (!this.running)
        return

      if (this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
      this.running = false
    }

    private async check(): Promise<void> {
      const update = await checkLauncherUpdate(this.dependencies.stateStore)
      if (update) {
        const message = formatLauncherUpdate(update)
        await this.dependencies.telegram.sendMessage({
          text: message,
          chatIds: this.config.chatIds,
          disableLinkPreview: true,
        })
        if (this.dependencies.webhooks) {
          await this.dependencies.webhooks.send('launcher', formatLauncherEmbed(update))
        }
        this.dependencies.logger(this.name, `Update detected: ${update.version}`)
      }
    }
  }

  return new HytaleLauncherModule(config, deps)
}
