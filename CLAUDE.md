# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev      # Run with hot-reload (development)
pnpm start    # Run production
npx eslint src/  # ESLint check
```

## Architecture

Modular notification system supporting Discord message forwarding and Hytale update tracking.

```
src/
├── index.ts              # Module orchestrator entry point
├── env.ts                # Environment variables
├── config.ts             # Unified config loader with legacy migration
├── types.ts              # Shared TypeScript interfaces
│
├── core/                 # Shared infrastructure
│   ├── module.ts         # Module interface
│   ├── telegram-client.ts # Telegram client wrapper
│   ├── token-manager.ts  # OAuth token storage + auto-refresh
│   └── state-store.ts    # Persistent state for trackers
│
└── modules/              # Pluggable modules
    ├── discord-forwarder/ # Discord → Telegram message forwarding
    ├── hytale-launcher/   # Launcher version tracker
    ├── hytale-patches/    # Game patches tracker (auth:launcher)
    ├── hytale-downloader/ # Downloader version tracker
    └── hytale-server/     # Server software tracker (auth:downloader)
```

## Modules

### Discord Forwarder
Tracks Discord servers and forwards messages to Telegram topics based on channel/role matching.

### Hytale Update Trackers
- **hytale-launcher**: Polls `launcher.hytale.com/version/release/launcher.json` (no auth)
- **hytale-patches**: Polls `account-data.hytale.com/my-account/get-launcher-data` (requires `auth:launcher` scope)
- **hytale-downloader**: Polls `downloader.hytale.com/version.json` (no auth)
- **hytale-server**: Two-step process via `account-data.hytale.com/game-assets/version/<patchline>.json` (requires `auth:downloader` scope)

## Config

### `.env`
```
DISCORD_TOKEN=your_discord_user_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### `config.json`

```json
{
  "telegram": { "botToken": "TELEGRAM_BOT_TOKEN" },
  "modules": {
    "discord-forwarder": {
      "enabled": true,
      "ignoredUserIds": [],
      "chatId": "-100123456789",
      "servers": [
        {
          "name": "Hytale",
          "guildId": "123456789012345678",
          "roles": [
            { "id": "111111111111111111", "name": "Developer", "topicId": 5 }
          ]
        }
      ]
    },
    "hytale-launcher": {
      "enabled": true,
      "pollIntervalMinutes": 5,
      "chatIds": ["-100123456789"]
    },
    "hytale-patches": {
      "enabled": true,
      "pollIntervalMinutes": 5,
      "chatIds": ["-100123456789"],
      "patchlines": ["release", "pre-release"]
    },
    "hytale-downloader": {
      "enabled": true,
      "pollIntervalMinutes": 5,
      "chatIds": ["-100123456789"]
    },
    "hytale-server": {
      "enabled": true,
      "pollIntervalMinutes": 5,
      "chatIds": ["-100123456789"],
      "patchlines": ["release", "pre-release"]
    }
  },
  "hytaleAuth": {
    "launcher": {
      "clientId": "hytale-launcher",
      "tokenFile": "./tokens/launcher.json"
    },
    "downloader": {
      "clientId": "hytale-downloader",
      "tokenFile": "./tokens/downloader.json"
    }
  }
}
```

## Token Setup

For authenticated endpoints (hytale-patches, hytale-server), create `tokens/*.json` files:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_at": 1737123456789,
  "scope": "auth:launcher"
}
```

Tokens are automatically refreshed before expiry (5min buffer).

## Code Style

- ESM with `.js` extensions in imports
- Node globals via explicit imports (`import process from 'node:process'`)
- @antfu/eslint-config with 2-space indent, single quotes
