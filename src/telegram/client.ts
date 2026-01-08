import { Telegram } from 'wrappergram'
import env from '../env.js'

export const telegram = new Telegram(env.telegramBotToken)
