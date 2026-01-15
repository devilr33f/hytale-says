import type { Module, ModuleDependencies } from '../../core/module.js'
import type { HytaleServerConfig } from '../../types.js'
import { formatServerUpdate } from './formatter.js'
import { checkServerUpdate } from './tracker.js'

export function hytaleServerFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
): Module {
  const config = moduleConfig as HytaleServerConfig

  class HytaleServerModule implements Module {
    readonly name = 'hytale-server'
    private dependencies: ModuleDependencies
    private config: HytaleServerConfig
    private running = false
    private intervalId: NodeJS.Timeout | null = null

    constructor(cfg: HytaleServerConfig, deps: ModuleDependencies) {
      this.config = cfg
      this.dependencies = deps
    }

    isRunning(): boolean {
      return this.running
    }

    async start(): Promise<void> {
      if (this.running)
        return

      if (!this.dependencies.tokenManager) {
        throw new Error('hytale-server requires tokenManager')
      }

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
      const token = await this.dependencies.tokenManager!.getAccessToken('downloader')
      const updates = await checkServerUpdate(
        this.dependencies.stateStore,
        this.config.patchlines,
        token,
      )

      for (const update of updates) {
        const message = formatServerUpdate(update)
        await this.dependencies.telegram.sendMessage({
          text: message,
          chatIds: this.config.chatIds,
          disableLinkPreview: true,
        })
        this.dependencies.logger(this.name, `Update detected: ${update.patchline} ${update.version}`)
      }
    }
  }

  return new HytaleServerModule(config, deps)
}
