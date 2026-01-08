import { Client } from 'discord.js-selfbot-v13'
import env from '../env.js'

export const discord = new Client()

export async function startDiscord(): Promise<void> {
  await discord.login(env.discordToken)
  console.log(`Discord logged in as ${discord.user?.tag}`)
}
