#!/usr/bin/env node

import { FastMCP, UserError } from "fastmcp"
import { 
  Client, 
  TextChannel, 
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  GuildMember,
  PermissionFlagsBits,
  Collection,
  ApplicationCommandData,
  Interaction
} from 'discord.js'
import { z } from 'zod'
import { discordClientManager } from './discord-client-manager.js'
import { responseHandlerRegistry } from './response-handlers/index.js'
import { commands } from "./slash-commands/commands.js"
import { tokenErrorMessage } from "./shared.js"
import { setupSlashCommandInteractionHandlers } from "./slash-commands/handlers.js"
import { config } from './config.js'
import { logger } from './logger.js'

// Validation schemas
const SendMessageSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  message: z.string(),
})

const _SendMessageSchema = SendMessageSchema.extend({
  token: z.string().optional().describe('Discord bot token'),
})

const ReadMessagesSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  limit: z.number().min(1).max(100).default(50),
})

const _ReadMessagesSchema = ReadMessagesSchema.extend({
  token: z.string().optional().describe('Discord bot token'),
})

const RegisterCommandsSchema = z.object({
  server: z.string().optional().describe('Server ID to register commands to (optional, if not provided commands will be registered globally)'),
})

const _RegisterCommandsSchema = RegisterCommandsSchema.extend({
  token: z.string().optional().describe('Discord bot token'),
})

const CreateListenerSchema = z.object({
  server: z.string().optional().describe('Server name or ID (optional)'),
  channel: z.string().optional().describe('Channel name or ID (optional)'),
  keywords: z.array(z.string()).describe('Keywords to listen for'),
  handlerId: z.string().describe('ID of the response handler to use'),
  handlerOptions: z.any().optional().describe('Options for the response handler'),
  description: z.string().optional().describe('Description of this listener'),
})

const _CreateListenerSchema = CreateListenerSchema.extend({
  token: z.string().optional().describe('Discord bot token'),
})

const RemoveListenerSchema = z.object({
  listenerId: z.string().describe('ID of the listener to remove'),
})

const ListListenersSchema = z.object({})

const _ListListenersSchema = ListListenersSchema.extend({
  token: z.string().optional().describe('Discord bot token'),
})

const ListHandlersSchema = z.object({})

// Create FastMCP server instance
const server = new FastMCP({
  name: "discord",
  version: "1.0.0",
})

// Add tools using FastMCP's addTool method
server.addTool({
  name: "send_message",
  description: "Send a message to a Discord channel",
  parameters: SendMessageSchema,
  execute: async (args) => {
    try {
      const { server: serverIdentifier, channel: channelIdentifier, message } = args

      let { token } = args as z.infer<typeof _SendMessageSchema>
      if (!token) {
        token = config.discordToken
        if (!token) {
          throw new UserError(tokenErrorMessage)
        }
      }
      
      // Get or create a client for this token
      const client = await discordClientManager.getClient(token)
      
      // Find the channel
      const channel = await discordClientManager.findChannel(client, channelIdentifier, serverIdentifier)
      
      const sent = await channel.send(message)
      return `Message sent successfully to #${channel.name} in ${channel.guild.name}. Message ID: ${sent.id}`
    } catch (error) {
      throw new UserError(`Failed to send message: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
})

server.addTool({
  name: "read_messages",
  description: "Read recent messages from a Discord channel",
  parameters: ReadMessagesSchema,
  execute: async (args) => {
    try {
      const { server: serverIdentifier, channel: channelIdentifier, limit } = args

      let { token } = args as z.infer<typeof _ReadMessagesSchema>
      if (!token) {
        token = config.discordToken
        if (!token) {
          throw new UserError(tokenErrorMessage)
        }
      }
      
      // Get or create a client for this token
      const client = await discordClientManager.getClient(token)
      
      // Find the channel
      const channel = await discordClientManager.findChannel(client, channelIdentifier, serverIdentifier)
      
      const messages = await channel.messages.fetch({ limit })
      const formattedMessages = Array.from(messages.values()).map(msg => ({
        channel: `#${channel.name}`,
        server: channel.guild.name,
        author: msg.author.tag,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
      }))

      return JSON.stringify(formattedMessages, null, 2)
    } catch (error) {
      throw new UserError(`Failed to read messages: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
})

server.addTool({
  name: "register_commands",
  description: "Register slash commands for a Discord bot",
  parameters: RegisterCommandsSchema,
  execute: async (args) => {
    try {
      const { server: serverId } = args

      let { token } = args as z.infer<typeof _RegisterCommandsSchema>
      if (!token) {
        token = config.discordToken
        if (!token) {
          throw new UserError(tokenErrorMessage)
        }
      }

      // Get or create a client for this token
      const client = await discordClientManager.getClient(token)

      // Wait for client to be ready
      if (!client.isReady()) {
        await new Promise<void>((resolve) => {
          const readyListener = () => {
            resolve()
            client.removeListener('ready', readyListener)
          }
          client.on('ready', readyListener)

          // If client is already ready, resolve immediately
          if (client.isReady()) {
            resolve()
          }
        })
      }

      // Register commands to a specific guild or globally
      let commandCollection: Collection<string, any>
      if (serverId) {
        const guild = await client.guilds.fetch(serverId)
        commandCollection = await guild.commands.set(commands)
      } else {
        if (!client.application) {
          throw new Error('Client application is not available')
        }
        commandCollection = await client.application.commands.set(commands)
      }

      // Set up interaction handlers if not already set up
      setupSlashCommandInteractionHandlers(client)

      return `Successfully registered ${commandCollection.size} slash commands${serverId ? ` to server ${serverId}` : ' globally'}.`
    } catch (error) {
      throw new UserError(`Failed to register commands: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
})

// New tools for message listeners
server.addTool({
  name: "create_listener",
  description: "Create a new message listener with keywords and a predefined response handler",
  parameters: CreateListenerSchema,
  execute: async (args) => {
    try {
      const { server: serverIdentifier, channel: channelIdentifier, keywords, handlerId, handlerOptions, description } = args

      let { token } = args as z.infer<typeof _CreateListenerSchema>
      if (!token) {
        token = config.discordToken
        if (!token) {
          throw new UserError(tokenErrorMessage)
        }
      }
      
      // Verify that the handler exists
      const handler = responseHandlerRegistry.getHandler(handlerId)
      if (!handler) {
        throw new UserError(`Response handler with ID "${handlerId}" not found`)
      }
      
      // Get client and resolve server/channel IDs if provided
      const client = await discordClientManager.getClient(token)
      
      let serverId: string | undefined
      let channelId: string | undefined
      
      if (serverIdentifier) {
        const guild = await discordClientManager.findGuild(client, serverIdentifier)
        serverId = guild.id
      }
      
      if (channelIdentifier && serverId) {
        const channel = await discordClientManager.findChannel(client, channelIdentifier, serverId)
        channelId = channel.id
      }
      
      // Create the listener
      const listenerId = await discordClientManager.addListener(token, {
        serverId,
        channelId,
        keywords,
        handlerId,
        handlerOptions,
        description,
      })
      
      return `Successfully created listener with ID: ${listenerId} using the "${handler.name}" response handler`
    } catch (error) {
      throw new UserError(`Failed to create listener: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
})

server.addTool({
  name: "remove_listener",
  description: "Remove an existing message listener",
  parameters: RemoveListenerSchema,
  execute: async (args) => {
    try {
      const { listenerId } = args
      
      const success = discordClientManager.removeListener(listenerId)
      
      if (success) {
        return `Successfully removed listener with ID: ${listenerId}`
      } else {
        return `Listener with ID ${listenerId} not found`
      }
    } catch (error) {
      throw new UserError(`Failed to remove listener: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
})

server.addTool({
  name: "list_listeners",
  description: "List all active message listeners",
  parameters: ListListenersSchema,
  execute: async (args) => {
    try {
      let { token } = args as z.infer<typeof _ListListenersSchema>
      
      const listeners = discordClientManager.getListeners(token)
      
      return JSON.stringify(listeners, null, 2)
    } catch (error) {
      throw new UserError(`Failed to list listeners: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
})

server.addTool({
  name: "list_handlers",
  description: "List all available response handlers",
  parameters: ListHandlersSchema,
  execute: async () => {
    try {
      const handlers = responseHandlerRegistry.listHandlers().map(h => ({
        id: h.id,
        name: h.name,
        description: h.description
      }))
      
      return JSON.stringify(handlers, null, 2)
    } catch (error) {
      throw new UserError(`Failed to list handlers: ${error instanceof Error ? error.message : String(error)}`)
    }
  },
})

// Set up connection event handling
server.on("connect", (event) => {
  logger.info("Client connected")
})

server.on("disconnect", (event) => {
  logger.info("Client disconnected")
  
  // Clean up resources
  discordClientManager.destroyAll()
})

// Set up cleanup on exit
const cleanup = () => {
  logger.info("Cleaning up resources...")
  discordClientManager.destroyAll()
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(0)
})

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error instanceof Error ? error.message : String(error))
  cleanup()
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason instanceof Error ? reason.message : String(reason))
  cleanup()
  process.exit(1)
})

// Handle normal process exit
process.on('exit', () => {
  logger.info('Process exiting, cleaning up...')
  cleanup()
})

// Start the server using FastMCP's start method
server.start({
  transportType: "stdio",
})

logger.info("Discord MCP Server running on stdio")
