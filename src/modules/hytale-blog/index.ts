import type { ModuleDependencies } from '../../core/module.js'
import type { HytaleBlogConfig } from '../../types.js'
import { createPollingModule } from '../../core/create-polling-module.js'
import { formatBlogEmbed } from '../discord-webhooks/formatter.js'
import { formatBlogUpdate } from './formatter.js'
import { checkBlogUpdates } from './tracker.js'

export function hytaleBlogFactory(
  moduleConfig: unknown,
  deps: ModuleDependencies,
) {
  const config = moduleConfig as HytaleBlogConfig

  return createPollingModule('hytale-blog', config, deps, async () => {
    const newPosts = await checkBlogUpdates(deps.stateStore)

    for (const post of newPosts) {
      const buttons = [[{ text: 'Read the full post', url: post.link }]]

      await deps.telegram.sendMessage({
        text: formatBlogUpdate(post),
        chatIds: config.chatIds,
        disableLinkPreview: false,
        buttons,
      })

      if (deps.webhooks) {
        await deps.webhooks.send('blog', formatBlogEmbed(post))
      }

      deps.logger('hytale-blog', `new post: ${post.title}`)
    }

    if (newPosts.length === 0) {
      deps.logger('hytale-blog', 'no new posts')
    }
  })
}
