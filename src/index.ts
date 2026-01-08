import process from 'node:process'
import { config } from './config.js'
import { discord, startDiscord } from './discord/client.js'
import { setupHandlers } from './discord/handlers.js'

console.log(`Loaded ${config.servers.length} server(s) to track`)

setupHandlers()

startDiscord().catch((err: unknown) => {
  console.error('Failed to start Discord client:', err)
  process.exit(1)
})

process.once('SIGINT', () => {
  console.log('Shutting down...')
  discord.destroy()
  process.exit(0)
})

process.once('SIGTERM', () => {
  console.log('Shutting down...')
  discord.destroy()
  process.exit(0)
})
