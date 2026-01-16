import process, { env } from 'node:process'
import { Client } from 'discord.js-selfbot-v13'

const DISCORD_TOKEN = env['DISCORD_TOKEN']

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN is not set')
  process.exit(1)
}

const link = process.argv[2]
if (!link) {
  console.error('Usage: pnpm tsx src/debug-message.ts <discord-message-link>')
  process.exit(1)
}

const match = link.match(/channels\/(\d+)\/(\d+)\/(\d+)/)
if (!match) {
  console.error('Invalid Discord message link')
  process.exit(1)
}

const [, guildId, channelId, messageId] = match

const client = new Client()

client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}\n`)

  try {
    const guild = client.guilds.cache.get(guildId)
    if (!guild) {
      console.error(`Guild ${guildId} not found`)
      process.exit(1)
    }

    const channel = guild.channels.cache.get(channelId)
    if (!channel || !('messages' in channel)) {
      console.error(`Channel ${channelId} not found or not a text channel`)
      process.exit(1)
    }

    const message = await channel.messages.fetch(messageId)

    console.log('=== MESSAGE PAYLOAD ===\n')
    console.log(JSON.stringify({
      id: message.id,
      content: message.content,
      author: {
        id: message.author.id,
        username: message.author.username,
        displayName: message.author.displayName,
        bot: message.author.bot,
      },
      type: message.type,
      flags: message.flags.toArray(),
      reference: message.reference,
      messageSnapshots: (message as any).messageSnapshots,
      embeds: message.embeds.map(e => ({
        type: e.type,
        title: e.title,
        description: e.description?.slice(0, 100),
        url: e.url,
        author: e.author,
      })),
      attachments: message.attachments.map(a => ({
        id: a.id,
        name: a.name,
        contentType: a.contentType,
        url: a.url,
      })),
      components: message.components.length,
    }, null, 2))
  }
  catch (err) {
    console.error('Error fetching message:', err)
  }

  client.destroy()
  process.exit(0)
})

client.login(env.discordToken)
