import type { Module, ModuleDependencies } from '../../core/module.js'
import type { HytaleBlogConfig } from '../../types.js'
import { formatBlogEmbed } from '../discord-webhooks/formatter.js'
import { formatBlogUpdate } from './formatter.js'
import { checkBlogUpdates, getBlogUrl, getThumbnailUrl } from './tracker.js'

export function hytaleBlogFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
): Module {
  const config = moduleConfig as HytaleBlogConfig

  class HytaleBlogModule implements Module {
    readonly name = 'hytale-blog'
    private dependencies: ModuleDependencies
    private config: HytaleBlogConfig
    private running = false
    private intervalId: NodeJS.Timeout | null = null

    constructor(cfg: HytaleBlogConfig, deps: ModuleDependencies) {
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
      const newPosts = await checkBlogUpdates(this.dependencies.stateStore)

      for (const post of newPosts) {
        const message = formatBlogUpdate(post)
        const thumbnail = getThumbnailUrl(post)
        const blogUrl = getBlogUrl(post)
        const buttons = [[{ text: 'Read the full post', url: blogUrl }]]

        if (thumbnail) {
          await this.dependencies.telegram.sendPhoto({
            photoUrl: thumbnail,
            caption: message,
            chatIds: this.config.chatIds,
            buttons,
          })
        }
        else {
          await this.dependencies.telegram.sendMessage({
            text: message,
            chatIds: this.config.chatIds,
            disableLinkPreview: false,
            buttons,
          })
        }

        if (this.dependencies.webhooks) {
          await this.dependencies.webhooks.send('blog', formatBlogEmbed(post))
        }

        this.dependencies.logger(this.name, `New post: ${post.title}`)
      }

      if (newPosts.length === 0) {
        this.dependencies.logger(this.name, 'No new posts')
      }
    }
  }

  return new HytaleBlogModule(config, deps)
}
