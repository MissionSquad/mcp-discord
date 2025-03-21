import { Client, Message } from 'discord.js'
import { ResponseHandler } from '../types.js'
import { logger } from '../logger.js'
import { retryWithExponentialBackoff } from '@missionsquad/common'
import { config } from '../config.js'

/**
 * Echo handler that echoes the user's message back to them
 * This is an example of a custom response handler
 */
export const echoHandler: ResponseHandler = {
  id: 'echo',
  name: 'Echo',
  description: 'Echoes the user\'s message back to them',
  handle: async (message: Message, client: Client, options?: any) => {
    try {
      // Extract the content to echo
      // Remove any keywords that might have triggered this handler
      let content = message.content
      
      // If options include keywords to remove, filter them out
      if (options?.keywords && Array.isArray(options.keywords)) {
        for (const keyword of options.keywords) {
          content = content.replace(new RegExp(keyword, 'gi'), '').trim()
        }
      }
      
      // If content is empty after removing keywords, use a default message
      if (!content) {
        content = "You didn't say anything after the keyword!"
      }
      
      // Add a prefix if specified in options
      const prefix = options?.prefix || 'You said:'
      const responseText = `${prefix} ${content}`
      
      // Use retry with exponential backoff for reliability
      await retryWithExponentialBackoff(
        async () => {
          await message.reply(responseText)
          logger.debug(`Echo handler replied to message from ${message.author.tag}`)
        },
        () => logger.warn(`Retrying to send echo response to ${message.author.tag}`),
        config.maxRetries,
        config.retryBaseDelay
      )
    } catch (error) {
      logger.error(`Error in echo handler: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
