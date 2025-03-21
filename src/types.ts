import { Client, Message } from 'discord.js'

/**
 * Response handler interface
 */
export interface ResponseHandler {
  id: string                 // Unique identifier
  name: string               // Human-readable name
  description: string        // Description of what the handler does
  handle: (message: Message, client: Client, options?: any) => Promise<void> // Handler function
}

/**
 * Listener options interface
 */
export interface ListenerOptions {
  serverId?: string        // Optional server ID or name
  channelId?: string       // Optional channel ID or name
  keywords: string[]       // Keywords to listen for
  handlerId: string        // ID of the response handler to use
  handlerOptions?: any     // Optional configuration for the handler
  description?: string     // Optional description
}

/**
 * Message listener interface
 */
export interface MessageListener {
  id: string               // Unique ID for this listener
  options: ListenerOptions // Configuration options
  active: boolean          // Whether this listener is active
  createdAt: Date          // When this listener was created
}

/**
 * Listener info interface (for returning to clients)
 */
export interface ListenerInfo {
  id: string
  serverId?: string
  channelId?: string
  keywords: string[]
  handlerId: string
  description?: string
  active: boolean
  createdAt: string
}

/**
 * Client info interface
 */
export interface ClientInfo {
  client: Client
  listeners: Map<string, MessageListener>
  lastUsed: number
}
