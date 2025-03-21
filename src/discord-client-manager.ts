import { 
  Client, 
  GatewayIntentBits, 
  ClientOptions, 
  Message,
  TextChannel,
  ChannelType
} from 'discord.js'
import { v4 as uuidv4 } from 'uuid'
import { retryWithExponentialBackoff } from '@missionsquad/common'
import { ClientInfo, ListenerInfo, ListenerOptions, MessageListener } from './types.js'
import { responseHandlerRegistry } from './response-handlers/index.js'
import { config } from './config.js'
import { logger } from './logger.js'

/**
 * Discord client manager to handle multiple clients and listeners
 */
export class DiscordClientManager {
  private clients: Map<string, ClientInfo> = new Map()
  private readonly cleanupInterval: number
  private readonly clientOptions: ClientOptions

  constructor(options?: {
    cleanupInterval?: number
    intents?: GatewayIntentBits[]
  }) {
    // Use provided options or defaults from config
    this.cleanupInterval = options?.cleanupInterval ?? config.cleanupInterval
    
    this.clientOptions = {
      intents: options?.intents ?? [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
      ],
    }
    
    // Start cleanup timer
    setInterval(() => this.cleanupInactiveClients(), this.cleanupInterval)
    
    logger.info('Discord client manager initialized')
  }

  /**
   * Get or create a Discord client for the given token
   * @param token Discord bot token
   * @returns Discord client
   */
  public async getClient(token: string): Promise<Client> {
    // Check if we already have a client for this token
    const existingClientInfo = this.clients.get(token)
    if (existingClientInfo) {
      // Update last used timestamp
      existingClientInfo.lastUsed = Date.now()
      return existingClientInfo.client
    }

    // Create a new client
    const client = new Client(this.clientOptions)
    
    try {
      // Login with the provided token
      await client.login(token)
      
      // Create client info
      const clientInfo: ClientInfo = {
        client,
        listeners: new Map(),
        lastUsed: Date.now(),
      }
      
      // Store the client in our map
      this.clients.set(token, clientInfo)
      
      // Set up message handler
      this.setupMessageHandler(client, token)
      
      return client
    } catch (error) {
      // Clean up the client if login fails
      client.destroy()
      throw new Error(`Failed to login with the provided Discord token: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Set up message handler for a client
   * @param client Discord client
   * @param token Discord bot token
   */
  private setupMessageHandler(client: Client, token: string): void {
    client.on('messageCreate', async (message: Message) => {
      // Ignore messages from bots
      if (message.author.bot) return
      
      // Get client info
      const clientInfo = this.clients.get(token)
      if (!clientInfo) return
      
      // Process message with all active listeners
      for (const listener of clientInfo.listeners.values()) {
        if (!listener.active) continue
        
        // Check server constraint if specified
        if (listener.options.serverId && message.guild?.id !== listener.options.serverId) {
          continue
        }
        
        // Check channel constraint if specified
        if (listener.options.channelId && message.channel.id !== listener.options.channelId) {
          continue
        }
        
        // Check if message contains any keywords
        const containsKeyword = listener.options.keywords.some(keyword => 
          message.content.toLowerCase().includes(keyword.toLowerCase())
        )
        
        if (!containsKeyword) continue
        
        // Get the response handler
        const handler = responseHandlerRegistry.getHandler(listener.options.handlerId)
        if (!handler) {
          logger.error(`Handler with ID "${listener.options.handlerId}" not found for listener ${listener.id}`)
          continue
        }
        
        // Execute the response handler
        try {
          await handler.handle(message, client, listener.options.handlerOptions)
        } catch (error) {
          logger.error(`Error in listener ${listener.id} with handler ${handler.id}:`, error instanceof Error ? error.message : String(error))
        }
      }
    })
  }

  /**
   * Add a message listener to a client
   * @param token Discord bot token
   * @param options Listener options
   * @returns Listener ID
   */
  public async addListener(token: string, options: ListenerOptions): Promise<string> {
    // Get or create client
    await this.getClient(token)
    
    // Get client info
    const clientInfo = this.clients.get(token)
    if (!clientInfo) {
      throw new Error('Failed to get client info')
    }
    
    // Create listener
    const id = uuidv4()
    const listener: MessageListener = {
      id,
      options,
      active: true,
      createdAt: new Date(),
    }
    
    // Add listener to client
    clientInfo.listeners.set(id, listener)
    
    return id
  }

  /**
   * Remove a listener
   * @param listenerId Listener ID
   * @returns Whether the listener was removed
   */
  public removeListener(listenerId: string): boolean {
    // Search for the listener in all clients
    for (const clientInfo of this.clients.values()) {
      if (clientInfo.listeners.has(listenerId)) {
        return clientInfo.listeners.delete(listenerId)
      }
    }
    
    return false
  }

  /**
   * Get all listeners for a specific token or all tokens
   * @param token Optional Discord bot token
   * @returns Array of listener info objects
   */
  public getListeners(token?: string): ListenerInfo[] {
    const listeners: ListenerInfo[] = []
    
    // If token is provided, only get listeners for that token
    if (token) {
      const clientInfo = this.clients.get(token)
      if (clientInfo) {
        for (const listener of clientInfo.listeners.values()) {
          listeners.push(this.formatListenerInfo(listener))
        }
      }
    } else {
      // Get listeners for all tokens
      for (const clientInfo of this.clients.values()) {
        for (const listener of clientInfo.listeners.values()) {
          listeners.push(this.formatListenerInfo(listener))
        }
      }
    }
    
    return listeners
  }

  /**
   * Format listener info for external use
   * @param listener Message listener
   * @returns Listener info
   */
  private formatListenerInfo(listener: MessageListener): ListenerInfo {
    return {
      id: listener.id,
      serverId: listener.options.serverId,
      channelId: listener.options.channelId,
      keywords: listener.options.keywords,
      handlerId: listener.options.handlerId,
      description: listener.options.description,
      active: listener.active,
      createdAt: listener.createdAt.toISOString(),
    }
  }

  /**
   * Clean up inactive clients to free resources
   */
  private cleanupInactiveClients(): void {
    const now = Date.now()
    
    for (const [token, clientInfo] of this.clients.entries()) {
      // If client hasn't been used in the cleanup interval, destroy it
      if (now - clientInfo.lastUsed > this.cleanupInterval) {
        clientInfo.client.destroy()
        this.clients.delete(token)
        logger.info(`Cleaned up inactive Discord client for token ending with ...${token.slice(-5)}`)
      }
    }
  }

  /**
   * Destroy all clients and clear the cache
   */
  public destroyAll(): void {
    for (const [token, clientInfo] of this.clients.entries()) {
      clientInfo.client.destroy()
      this.clients.delete(token)
    }
  }

  /**
   * Helper function to find a guild by name or ID
   * @param client Discord client
   * @param guildIdentifier Guild name or ID
   * @returns Guild object
   */
  public async findGuild(client: Client, guildIdentifier?: string) {
    return retryWithExponentialBackoff(
      async () => {
        if (!guildIdentifier) {
          // If no guild specified and bot is only in one guild, use that
          if (client.guilds.cache.size === 1) {
            logger.debug('Using the only available guild')
            return client.guilds.cache.first()!
          }
          // List available guilds
          const guildList = Array.from(client.guilds.cache.values())
            .map(g => `"${g.name}"`).join(', ')
          throw new Error(`Bot is in multiple servers. Please specify server name or ID. Available servers: ${guildList}`)
        }

        // Try to fetch by ID first
        try {
          logger.debug(`Attempting to fetch guild by ID: ${guildIdentifier}`)
          const guild = await client.guilds.fetch(guildIdentifier)
          if (guild) return guild
        } catch (error) {
          logger.debug(`Failed to fetch guild by ID, trying by name: ${error instanceof Error ? error.message : String(error)}`)
          // If ID fetch fails, search by name
          const guilds = client.guilds.cache.filter(
            g => g.name.toLowerCase() === guildIdentifier.toLowerCase()
          )
          
          if (guilds.size === 0) {
            const availableGuilds = Array.from(client.guilds.cache.values())
              .map(g => `"${g.name}"`).join(', ')
            throw new Error(`Server "${guildIdentifier}" not found. Available servers: ${availableGuilds}`)
          }
          if (guilds.size > 1) {
            const guildList = guilds.map(g => `${g.name} (ID: ${g.id})`).join(', ')
            throw new Error(`Multiple servers found with name "${guildIdentifier}": ${guildList}. Please specify the server ID.`)
          }
          return guilds.first()!
        }
        throw new Error(`Server "${guildIdentifier}" not found`)
      },
      () => logger.warn(`Retrying to find guild: ${guildIdentifier}`),
      config.maxRetries,
      config.retryBaseDelay
    )
  }

  /**
   * Helper function to find a channel by name or ID within a specific guild
   * @param client Discord client
   * @param channelIdentifier Channel name or ID
   * @param guildIdentifier Guild name or ID
   * @returns Text channel object
   */
  public async findChannel(client: Client, channelIdentifier: string, guildIdentifier?: string): Promise<TextChannel> {
    return retryWithExponentialBackoff(
      async () => {
        const guild = await this.findGuild(client, guildIdentifier)
        
        logger.debug(`Finding channel "${channelIdentifier}" in guild "${guild.name}"`)
        
        // First try to fetch by ID
        try {
          const channel = await client.channels.fetch(channelIdentifier)
          if (channel instanceof TextChannel && channel.guild.id === guild.id) {
            return channel
          }
        } catch (error) {
          logger.debug(`Failed to fetch channel by ID, trying by name: ${error instanceof Error ? error.message : String(error)}`)
          // If fetching by ID fails, search by name in the specified guild
          const channels = guild.channels.cache.filter(
            (channel: any): channel is TextChannel =>
              channel instanceof TextChannel &&
              (channel.name.toLowerCase() === channelIdentifier.toLowerCase() ||
               channel.name.toLowerCase() === channelIdentifier.toLowerCase().replace('#', ''))
          )

          if (channels.size === 0) {
            const availableChannels = guild.channels.cache
              .filter((c: any): c is TextChannel => c instanceof TextChannel)
              .map((c: TextChannel) => `"#${c.name}"`).join(', ')
            throw new Error(`Channel "${channelIdentifier}" not found in server "${guild.name}". Available channels: ${availableChannels}`)
          }
          if (channels.size > 1) {
            const channelList = channels.map((c: TextChannel) => `#${c.name} (${c.id})`).join(', ')
            throw new Error(`Multiple channels found with name "${channelIdentifier}" in server "${guild.name}": ${channelList}. Please specify the channel ID.`)
          }
          return channels.first()!
        }
        throw new Error(`Channel "${channelIdentifier}" is not a text channel or not found in server "${guild.name}"`)
      },
      () => logger.warn(`Retrying to find channel: ${channelIdentifier}`),
      config.maxRetries,
      config.retryBaseDelay
    )
  }
}

// Create a singleton instance
export const discordClientManager = new DiscordClientManager()
