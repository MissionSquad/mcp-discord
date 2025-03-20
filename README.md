# Discord MCP Server

A Model Context Protocol (MCP) server built with FastMCP that enables LLMs to interact with Discord channels, allowing them to send and read messages through Discord's API. Using this server, LLMs like Claude can directly interact with Discord channels while maintaining user control and security.

## Features

- Built with FastMCP framework for simplified MCP server development
- Send messages to Discord channels
- Read recent messages from channels
- Register slash commands for your Discord bot
- Automatic server and channel discovery
- Support for both channel names and IDs
- Proper error handling and validation
- Efficient Discord client management with automatic cleanup
- Token flexibility: All tools accept an optional (hidden) `token` parameter or will use the DISCORD_TOKEN environment variable as fallback

## Prerequisites

- Node.js 20.x or higher
- A Discord bot token
- The bot must be invited to your server with proper permissions:
  - Read Messages/View Channels
  - Send Messages
  - Read Message History
  - For slash commands: Applications.Commands permission

## Setup

1. Clone this repository:
```bash
git clone https://github.com/yourusername/mcp-discord.git
cd mcp-discord
```

2. Install dependencies:
```bash
npm install
```

3. Build the server:
```bash
npm run build
```

## Usage with Claude for Desktop

1. Open your Claude for Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the Discord MCP server configuration:
```javascript
{
  "mcpServers": {
    "discord": {
      "command": "node",
      "args": ["path/to/mcp-discord/dist/index.js"],
      "env": {
        "DISCORD_TOKEN": "your_discord_bot_token" // Optional, can be provided in tool parameters instead
      }
    }
  }
}
```

3. Restart Claude for Desktop

## Available Tools

### send-message
Sends a message to a specified Discord channel.

Parameters:
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general") or ID
- `message`: Message content to send

Example:
```json
{
  "channel": "general",
  "message": "Hello from MCP!"
}
```

### read-messages
Reads recent messages from a specified Discord channel.

Parameters:
- `server` (optional): Server name or ID (required if bot is in multiple servers)
- `channel`: Channel name (e.g., "general") or ID
- `limit` (optional): Number of messages to fetch (default: 50, max: 100)

Example:
```javascript
{
  "channel": "general",
  "limit": 10
}
```

### register-commands
Registers slash commands for your Discord bot.

Parameters:
- `server` (optional): Server ID to register commands to (if not provided, commands will be registered globally)

Example:
```javascript
{
  "server": "123456789012345678" // Optional server ID
}
```

## Slash Commands

The server registers the following slash commands for your Discord bot:

- `/ping`: Replies with "Pong!"
- `/kick`: Kicks a user from the server (requires kick permissions)
- `/ban`: Bans a user from the server (requires ban permissions)
- `/slowmode`: Sets slowmode for the current channel (requires manage channels permission)

## Development

1. Install development dependencies:
```bash
npm install --save-dev typescript @types/node
```

2. Start the server in development mode:
```bash
npm run dev
```

## Testing with FastMCP Tools

You can test the server using FastMCP's built-in tools:

```bash
# Test with FastMCP CLI
npx fastmcp dev dist/index.js

# Test with MCP Inspector
npx fastmcp inspect dist/index.js
```

Alternatively, you can use the standard MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Examples

Here are some example interactions you can try with Claude after setting up the Discord MCP server:

1. "Can you read the last 5 messages from the general channel?"
2. "Please send a message to the announcements channel saying 'Meeting starts in 10 minutes'."
3. "Register slash commands for my Discord bot."

Claude will use the appropriate tools to interact with Discord while asking for your approval before sending any messages or registering commands. If you've set the DISCORD_TOKEN environment variable, no token needs to be provided in these requests.

## Security Considerations

- The bot requires proper Discord permissions to function
- All message sending operations require explicit user approval
- Discord tokens should be provided securely and never committed to version control
- Channel access is limited to channels the bot has been given access to
- Consider using environment variables or secure storage for your Discord tokens

## How It Works

This MCP server is built using the FastMCP framework, which simplifies the creation of MCP servers. The server:

1. Manages Discord client connections efficiently, creating new clients as needed and cleaning up inactive ones
2. Provides tools for sending messages, reading messages, and registering slash commands
3. Handles Discord interactions for slash commands
4. Uses Zod for parameter validation
5. Implements proper error handling with FastMCP's UserError

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
1. Check the GitHub Issues section
2. Consult the MCP documentation at https://modelcontextprotocol.io
3. Consult the FastMCP documentation at https://github.com/punkpeye/fastmcp
4. Open a new issue with detailed reproduction steps
