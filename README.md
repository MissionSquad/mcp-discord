# MCP Discord Server

A Model Context Protocol (MCP) server for integrating Discord with Language Learning Models (LLMs).

## Overview

The MCP Discord server provides a set of tools that allow LLMs to interact with Discord, including:

- Sending messages to Discord channels
- Reading messages from Discord channels
- Registering slash commands for Discord bots
- Creating message listeners with customizable response handlers
- Managing message listeners

## Installation

### Prerequisites

- Node.js 18 or higher
- A Discord bot token (see [Creating a Discord Bot](#creating-a-discord-bot))

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mcp-discord.git
   cd mcp-discord
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Create a `.env` file in the root directory with your Discord bot token:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   LOG_LEVEL=info
   ```

5. Start the server:
   ```bash
   npm start
   ```

## Creating a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Navigate to the "Bot" tab and click "Add Bot"
4. Under the "TOKEN" section, click "Copy" to copy your bot token
5. Enable the following Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
6. Navigate to the "OAuth2" tab, then "URL Generator"
7. Select the following scopes:
   - bot
   - applications.commands
8. Select the following bot permissions:
   - Send Messages
   - Read Message History
   - Add Reactions
   - Use Slash Commands
9. Copy the generated URL and open it in your browser to add the bot to your server

## Configuration

The server can be configured using environment variables or by modifying the `config.ts` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Discord bot token | - |
| `LOG_LEVEL` | Logging level (error, warn, info, debug) | info |
| `CLEANUP_INTERVAL` | Interval in milliseconds to clean up inactive clients | 1800000 (30 minutes) |
| `MAX_RETRIES` | Maximum number of retries for operations | 3 |
| `RETRY_BASE_DELAY` | Base delay in milliseconds for retry operations | 1000 |

## Available Tools

### send-message

Send a message to a Discord channel.

**Parameters:**
- `server` (optional): Server name or ID (optional if bot is only in one server)
- `channel`: Channel name (e.g., "general") or ID
- `message`: The message to send

**Example:**
```json
{
  "server": "My Discord Server",
  "channel": "general",
  "message": "Hello from MCP Discord!"
}
```

### read-messages

Read recent messages from a Discord channel.

**Parameters:**
- `server` (optional): Server name or ID (optional if bot is only in one server)
- `channel`: Channel name (e.g., "general") or ID
- `limit` (optional): Number of messages to retrieve (default: 50, max: 100)

**Example:**
```json
{
  "server": "My Discord Server",
  "channel": "general",
  "limit": 10
}
```

### register-commands

Register slash commands for a Discord bot.

**Parameters:**
- `server` (optional): Server ID to register commands to (optional, if not provided commands will be registered globally)

**Example:**
```json
{
  "server": "123456789012345678"
}
```

### create-listener

Create a new message listener with keywords and a predefined response handler.

**Parameters:**
- `server` (optional): Server name or ID
- `channel` (optional): Channel name or ID
- `keywords`: Array of keywords to listen for
- `handlerId`: ID of the response handler to use
- `handlerOptions` (optional): Options for the response handler
- `description` (optional): Description of this listener

**Example:**
```json
{
  "server": "My Discord Server",
  "channel": "general",
  "keywords": ["hello", "hi"],
  "handlerId": "ack",
  "description": "Responds to greetings"
}
```

### remove-listener

Remove an existing message listener.

**Parameters:**
- `listenerId`: ID of the listener to remove

**Example:**
```json
{
  "listenerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### list-listeners

List all active message listeners.

**Parameters:** None

### list-handlers

List all available response handlers.

**Parameters:** None

## Response Handlers

Response handlers define how the bot responds to messages that match the keywords in a listener. The server comes with the following built-in handlers:

### ack

A simple acknowledgment handler that replies to the user with a simple acknowledgment message.

## Creating Custom Response Handlers

You can create custom response handlers by adding new files to the `src/response-handlers` directory. Each handler should implement the `ResponseHandler` interface:

```typescript
interface ResponseHandler {
  id: string                 // Unique identifier
  name: string               // Human-readable name
  description: string        // Description of what the handler does
  handle: (message: Message, client: Client, options?: any) => Promise<void> // Handler function
}
```

Example:

```typescript
// src/response-handlers/echo-handler.ts
import { Client, Message } from 'discord.js'
import { ResponseHandler } from '../types.js'

export const echoHandler: ResponseHandler = {
  id: 'echo',
  name: 'Echo',
  description: 'Echoes the user\'s message back to them',
  handle: async (message: Message) => {
    await message.reply(`You said: ${message.content}`)
  }
}
```

Then register your handler in `src/response-handlers/index.ts`:

```typescript
import { responseHandlerRegistry } from './registry.js'
import { ackHandler } from './ack-handler.js'
import { echoHandler } from './echo-handler.js'

// Register all handlers
responseHandlerRegistry.register(ackHandler)
responseHandlerRegistry.register(echoHandler)

// Export everything
export * from './registry.js'
export * from './ack-handler.js'
export * from './echo-handler.js'
```

## Error Handling

The server includes robust error handling with configurable logging levels. Errors are logged with appropriate context to help with debugging.

## License

MIT
