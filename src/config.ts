import dotenv from 'dotenv'
import { z } from 'zod'

// Load environment variables
dotenv.config()

// Define configuration schema
const ConfigSchema = z.object({
  discordToken: z.string().optional(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  cleanupInterval: z.number().min(1).default(30 * 60 * 1000), // 30 minutes
  maxRetries: z.number().min(1).default(3),
  retryBaseDelay: z.number().min(100).default(1000),
})

// Parse environment variables
export const config = ConfigSchema.parse({
  discordToken: process.env.DISCORD_TOKEN,
  logLevel: process.env.LOG_LEVEL,
  cleanupInterval: process.env.CLEANUP_INTERVAL ? parseInt(process.env.CLEANUP_INTERVAL) : undefined,
  maxRetries: process.env.MAX_RETRIES ? parseInt(process.env.MAX_RETRIES) : undefined,
  retryBaseDelay: process.env.RETRY_BASE_DELAY ? parseInt(process.env.RETRY_BASE_DELAY) : undefined,
})

// Export token error message
export const tokenErrorMessage = 'No token provided and DISCORD_TOKEN environment variable is not set'
