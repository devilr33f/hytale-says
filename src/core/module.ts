import type { StateStore } from './state-store.js'
import type { TelegramClient } from './telegram-client.js'
import type { TokenManager } from './token-manager.js'

export interface Module {
  readonly name: string
  start: () => Promise<void>
  stop: () => Promise<void>
  isRunning: () => boolean
}

export interface ModuleFactory {
  (config: unknown, deps: ModuleDependencies): Module
}

export interface ModuleDependencies {
  telegram: TelegramClient
  tokenManager?: TokenManager
  stateStore: StateStore
  logger: Logger
}

export type Logger = (module: string, message: string, ...args: unknown[]) => void
