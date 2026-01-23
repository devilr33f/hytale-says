import type { Module, ModuleDependencies } from '../../core/module.js'
import type { HytalePatchesConfig } from '../../types.js'
import { formatPatchesEmbed } from '../discord-webhooks/formatter.js'
import { formatPatchesUpdate } from './formatter.js'
import { checkPatchesUpdate } from './tracker.js'

export function hytalePatchesFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
): Module {
  const config = moduleConfig as HytalePatchesConfig

  class HytalePatchesModule implements Module {
    readonly name = 'hytale-patches'
    private dependencies: ModuleDependencies
    private config: HytalePatchesConfig
    private running = false
    private intervalId: NodeJS.Timeout | null = null

    constructor(cfg: HytalePatchesConfig, deps: ModuleDependencies) {
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
        throw new Error('hytale-patches requires tokenManager')
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
      const token = await this.dependencies.tokenManager!.getAccessToken('launcher')
      const updates = await checkPatchesUpdate(
        this.dependencies.stateStore,
        this.config.patchlines,
        token,
      )

      for (const update of updates) {
        const message = formatPatchesUpdate(update)
        await this.dependencies.telegram.sendMessage({
          text: message,
          chatIds: this.config.chatIds,
          disableLinkPreview: true,
        })
        if (this.dependencies.webhooks) {
          await this.dependencies.webhooks.send('patches', formatPatchesEmbed(update))
        }
        this.dependencies.logger(this.name, `Update detected: ${update.patchline} ${update.version}`)
      }
    }
  }

  return new HytalePatchesModule(config, deps)
}
