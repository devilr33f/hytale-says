import type { Module, ModuleDependencies } from '../../core/module.js'
import type { HytaleTrackerConfig } from '../../types.js'
import { formatPresskitUpdate } from './formatter.js'
import { checkPresskitUpdate } from './tracker.js'

export function hytalePresskitFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
): Module {
  const config = moduleConfig as HytaleTrackerConfig

  class HytalePresskitModule implements Module {
    readonly name = 'hytale-presskit'
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
      const update = await checkPresskitUpdate(this.dependencies.stateStore)
      if (update) {
        const message = formatPresskitUpdate(update)
        await this.dependencies.telegram.sendMessage({
          text: message,
          chatIds: this.config.chatIds,
          disableLinkPreview: true,
        })
        this.dependencies.logger(this.name, `Update detected: ${update.size} bytes`)
      }
    }
  }

  return new HytalePresskitModule(config, deps)
}
