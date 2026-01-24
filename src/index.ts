import type { Module, ModuleDependencies, WebhooksModule } from './core/module.js'
import process from 'node:process'
import { startApiServer } from './api/index.js'
import { config } from './config.js'
import { StateStore } from './core/state-store.js'
import { TelegramClient } from './core/telegram-client.js'
import { TokenManager } from './core/token-manager.js'

// Module factories
import { discordForwarderFactory } from './modules/discord-forwarder/index.js'
import { discordWebhooksFactory } from './modules/discord-webhooks/index.js'
import { hytaleBlogFactory } from './modules/hytale-blog/index.js'
import { hytaleDownloaderFactory } from './modules/hytale-downloader/index.js'
import { hytaleLauncherFactory } from './modules/hytale-launcher/index.js'
import { hytalePatchesFactory } from './modules/hytale-patches/index.js'
import { hytalePresskitFactory } from './modules/hytale-presskit/index.js'
import { hytaleServerFactory } from './modules/hytale-server/index.js'

const MODULE_FACTORIES: Record<string, (config: unknown, deps: ModuleDependencies) => Module> = {
  'discord-forwarder': discordForwarderFactory,
  'discord-webhooks': discordWebhooksFactory,
  'hytale-blog': hytaleBlogFactory,
  'hytale-launcher': hytaleLauncherFactory,
  'hytale-patches': hytalePatchesFactory,
  'hytale-downloader': hytaleDownloaderFactory,
  'hytale-presskit': hytalePresskitFactory,
  'hytale-server': hytaleServerFactory,
}

async function main() {
  // Initialize shared services
  const telegram = new TelegramClient(config.telegram.botToken)
  const tokenManager = new TokenManager()
  const stateStore = new StateStore()

  await stateStore.load()

  // Register auth configs
  if (config.hytaleAuth) {
    for (const [key, authConfig] of Object.entries(config.hytaleAuth)) {
      tokenManager.register(key, {
        clientId: authConfig.clientId,
        tokenEndpoint: authConfig.tokenEndpoint ?? 'https://oauth.accounts.hytale.com/oauth2/token',
        tokenFile: authConfig.tokenFile,
      })
    }
  }

  // Initialize modules
  const modules: Module[] = []
  const logger = (module: string, message: string, ...args: unknown[]) => {
    console.log(`[${module}] ${message}`, ...args)
  }

  const deps: ModuleDependencies = {
    telegram,
    tokenManager,
    stateStore,
    logger,
  }

  // Initialize discord-webhooks first if enabled (other modules depend on it)
  const webhooksConfig = config.modules['discord-webhooks']
  if (webhooksConfig?.enabled) {
    const webhooksModule = discordWebhooksFactory(webhooksConfig, deps) as WebhooksModule
    modules.push(webhooksModule)
    deps.webhooks = webhooksModule
    console.log(`Loaded module: ${webhooksModule.name}`)
  }

  for (const [moduleName, moduleConfig] of Object.entries(config.modules)) {
    if (moduleName === 'discord-webhooks')
      continue
    if (!moduleConfig.enabled) {
      continue
    }

    const factory = MODULE_FACTORIES[moduleName]
    if (!factory) {
      console.warn(`No factory found for module: ${moduleName}`)
      continue
    }

    const module = factory(moduleConfig, deps)
    modules.push(module)
    console.log(`Loaded module: ${module.name}`)
  }

  if (modules.length === 0) {
    console.warn('No modules enabled, exiting')
    process.exit(0)
  }

  // Start all modules
  console.log(`Starting ${modules.length} module(s)...`)
  for (const module of modules) {
    try {
      await module.start()
    }
    catch (err) {
      console.error(`Failed to start module ${module.name}:`, err)
      process.exit(1)
    }
  }

  // Start API server if enabled
  const apiConfig = config.modules.api as any
  if (apiConfig?.enabled) {
    const jwtSecret = process.env.JWT_SECRET || apiConfig.jwtSecret || 'your-secret-key'
    const port = process.env.API_PORT ? Number.parseInt(process.env.API_PORT, 10) : (apiConfig.port || 3000)
    const accountUuid = process.env.ACCOUNT_UUID || apiConfig.accountUuid

    try {
      await startApiServer({
        port,
        jwtSecret,
        stateStore,
        tokenManager,
        accountUuid,
      })
    }
    catch (err) {
      console.error('Failed to start API server:', err)
      process.exit(1)
    }
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...')
    await stateStore.flush()
    tokenManager.stopAll()
    telegram.destroy()

    for (const module of modules) {
      try {
        await module.stop()
      }
      catch (err) {
        console.error(`Error stopping module ${module.name}:`, err)
      }
    }

    process.exit(0)
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
