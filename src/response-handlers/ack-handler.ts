import { Client, Message } from 'discord.js'
import { ResponseHandler } from '../types.js'
import { logger } from '../logger.js'
import { retryWithExponentialBackoff } from '@missionsquad/common'
import { config } from '../config.js'

/**
 * Simple acknowledgment handler
 * Replies to the user with a simple acknowledgment message
 */
export const ackHandler: ResponseHandler = {
  id: 'ack',
  name: 'Acknowledgment',
  description: 'Replies to the user with a simple acknowledgment message',
  handle: async (message: Message, client: Client, options?: any) => {
    try {
      // Get custom acknowledgment text from options or use default
      const ackText = options?.text || 'ack'
      
      // Use retry with exponential backoff for reliability
      await retryWithExponentialBackoff(
        async () => {
          await message.reply(`${message.author} ${ackText}`)
          logger.debug(`Acknowledgment handler replied to message from ${message.author.tag}`)
        },
        () => logger.warn(`Retrying to send acknowledgment to ${message.author.tag}`),
        config.maxRetries,
        config.retryBaseDelay
      )
    } catch (error) {
      logger.error(`Error in acknowledgment handler: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
