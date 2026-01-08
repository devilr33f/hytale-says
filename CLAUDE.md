# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Run with hot-reload (development)
pnpm start    # Run production
pnpm lint     # ESLint check (npx eslint src/)
```

## Architecture

Discord-to-Telegram message forwarder. Tracks messages from users with specific roles on Discord servers and forwards them to Telegram topics.

```
src/
├── index.ts              # Entry point, initializes clients
├── env.ts                # Environment variables (DISCORD_TOKEN, TELEGRAM_BOT_TOKEN)
├── config.ts             # Loads config.json, validates server/role structure
├── types.ts              # Shared TypeScript interfaces
├── discord/
│   ├── client.ts         # discord.js-selfbot-v13 client
│   └── handlers.ts       # messageCreate handler, role priority filtering
└── telegram/
    ├── client.ts         # wrappergram client
    └── sender.ts         # Message forwarding, media group handling
```

**Flow**: Discord messageCreate → filter by guild + role → find highest priority role → forward to Telegram topic with attachments

**Role Priority**: Users with multiple tracked roles → message goes to first matching role's topic (config array order = priority)

## Config

- `config.json` - Server/role/topic mappings (see `config.json.example`)
- `.env` - Tokens (see `.env.example`)

## Code Style

- ESM with `.js` extensions in imports
- Node globals via explicit imports (`import process from 'node:process'`)
- @antfu/eslint-config with 2-space indent, single quotes
