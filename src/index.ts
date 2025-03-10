import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client, GatewayIntentBits, TextChannel, ClientOptions } from 'discord.js';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Discord client manager to handle multiple clients
class DiscordClientManager {
  private clients: Map<string, { client: Client; lastUsed: number }> = new Map();
  private readonly cleanupInterval = 30 * 60 * 1000; // 30 minutes
  private readonly clientOptions: ClientOptions = {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  };

  constructor() {
    // Start cleanup timer
    setInterval(() => this.cleanupInactiveClients(), this.cleanupInterval);
  }

  /**
   * Get or create a Discord client for the given token
   */
  public async getClient(token: string): Promise<Client> {
    // Check if we already have a client for this token
    const existingClient = this.clients.get(token);
    if (existingClient) {
      // Update last used timestamp
      existingClient.lastUsed = Date.now();
      return existingClient.client;
    }

    // Create a new client
    const client = new Client(this.clientOptions);
    
    try {
      // Login with the provided token
      await client.login(token);
      
      // Store the client in our map
      this.clients.set(token, {
        client,
        lastUsed: Date.now(),
      });
      
      return client;
    } catch (error) {
      // Clean up the client if login fails
      client.destroy();
      throw new Error(`Failed to login with the provided Discord token: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up inactive clients to free resources
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    
    for (const [token, { client, lastUsed }] of this.clients.entries()) {
      // If client hasn't been used in the cleanup interval, destroy it
      if (now - lastUsed > this.cleanupInterval) {
        client.destroy();
        this.clients.delete(token);
        console.error(`Cleaned up inactive Discord client for token ending with ...${token.slice(-5)}`);
      }
    }
  }

  /**
   * Destroy all clients and clear the cache
   */
  public destroyAll(): void {
    for (const [token, { client }] of this.clients.entries()) {
      client.destroy();
      this.clients.delete(token);
    }
  }
}

// Create a single instance of the client manager
const clientManager = new DiscordClientManager();

// Helper function to find a guild by name or ID
async function findGuild(client: Client, guildIdentifier?: string) {
  if (!guildIdentifier) {
    // If no guild specified and bot is only in one guild, use that
    if (client.guilds.cache.size === 1) {
      return client.guilds.cache.first()!;
    }
    // List available guilds
    const guildList = Array.from(client.guilds.cache.values())
      .map(g => `"${g.name}"`).join(', ');
    throw new Error(`Bot is in multiple servers. Please specify server name or ID. Available servers: ${guildList}`);
  }

  // Try to fetch by ID first
  try {
    const guild = await client.guilds.fetch(guildIdentifier);
    if (guild) return guild;
  } catch {
    // If ID fetch fails, search by name
    const guilds = client.guilds.cache.filter(
      g => g.name.toLowerCase() === guildIdentifier.toLowerCase()
    );
    
    if (guilds.size === 0) {
      const availableGuilds = Array.from(client.guilds.cache.values())
        .map(g => `"${g.name}"`).join(', ');
      throw new Error(`Server "${guildIdentifier}" not found. Available servers: ${availableGuilds}`);
    }
    if (guilds.size > 1) {
      const guildList = guilds.map(g => `${g.name} (ID: ${g.id})`).join(', ');
      throw new Error(`Multiple servers found with name "${guildIdentifier}": ${guildList}. Please specify the server ID.`);
    }
    return guilds.first()!;
  }
  throw new Error(`Server "${guildIdentifier}" not found`);
}

// Helper function to find a channel by name or ID within a specific guild
async function findChannel(client: Client, channelIdentifier: string, guildIdentifier?: string): Promise<TextChannel> {
  const guild = await findGuild(client, guildIdentifier);
  
  // First try to fetch by ID
  try {
    const channel = await client.channels.fetch(channelIdentifier);
    if (channel instanceof TextChannel && channel.guild.id === guild.id) {
      return channel;
    }
  } catch {
    // If fetching by ID fails, search by name in the specified guild
    const channels = guild.channels.cache.filter(
      (channel): channel is TextChannel =>
        channel instanceof TextChannel &&
        (channel.name.toLowerCase() === channelIdentifier.toLowerCase() ||
         channel.name.toLowerCase() === channelIdentifier.toLowerCase().replace('#', ''))
    );

    if (channels.size === 0) {
      const availableChannels = guild.channels.cache
        .filter((c): c is TextChannel => c instanceof TextChannel)
        .map(c => `"#${c.name}"`).join(', ');
      throw new Error(`Channel "${channelIdentifier}" not found in server "${guild.name}". Available channels: ${availableChannels}`);
    }
    if (channels.size > 1) {
      const channelList = channels.map(c => `#${c.name} (${c.id})`).join(', ');
      throw new Error(`Multiple channels found with name "${channelIdentifier}" in server "${guild.name}": ${channelList}. Please specify the channel ID.`);
    }
    return channels.first()!;
  }
  throw new Error(`Channel "${channelIdentifier}" is not a text channel or not found in server "${guild.name}"`);
}

// Updated validation schemas
const SendMessageSchema = z.object({
  token: z.string().describe('Discord bot token'),
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  message: z.string(),
});

const ReadMessagesSchema = z.object({
  token: z.string().describe('Discord bot token'),
  server: z.string().optional().describe('Server name or ID (optional if bot is only in one server)'),
  channel: z.string().describe('Channel name (e.g., "general") or ID'),
  limit: z.number().min(1).max(100).default(50),
});

// Create server instance
const server = new Server(
  {
    name: "discord",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "send-message",
        description: "Send a message to a Discord channel",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "Discord bot token",
            },
            server: {
              type: "string",
              description: 'Server name or ID (optional if bot is only in one server)',
            },
            channel: {
              type: "string",
              description: 'Channel name (e.g., "general") or ID',
            },
            message: {
              type: "string",
              description: "Message content to send",
            },
          },
          required: ["token", "channel", "message"],
        },
      },
      {
        name: "read-messages",
        description: "Read recent messages from a Discord channel",
        inputSchema: {
          type: "object",
          properties: {
            token: {
              type: "string",
              description: "Discord bot token",
            },
            server: {
              type: "string",
              description: 'Server name or ID (optional if bot is only in one server)',
            },
            channel: {
              type: "string",
              description: 'Channel name (e.g., "general") or ID',
            },
            limit: {
              type: "number",
              description: "Number of messages to fetch (max 100)",
              default: 50,
            },
          },
          required: ["token", "channel"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "send-message": {
        const { token, server: serverIdentifier, channel: channelIdentifier, message } = SendMessageSchema.parse(args);
        
        // Get or create a client for this token
        const client = await clientManager.getClient(token);
        
        // Find the channel
        const channel = await findChannel(client, channelIdentifier, serverIdentifier);
        
        const sent = await channel.send(message);
        return {
          content: [{
            type: "text",
            text: `Message sent successfully to #${channel.name} in ${channel.guild.name}. Message ID: ${sent.id}`,
          }],
        };
      }

      case "read-messages": {
        const { token, server: serverIdentifier, channel: channelIdentifier, limit } = ReadMessagesSchema.parse(args);
        
        // Get or create a client for this token
        const client = await clientManager.getClient(token);
        
        // Find the channel
        const channel = await findChannel(client, channelIdentifier, serverIdentifier);
        
        const messages = await channel.messages.fetch({ limit });
        const formattedMessages = Array.from(messages.values()).map(msg => ({
          channel: `#${channel.name}`,
          server: channel.guild.name,
          author: msg.author.tag,
          content: msg.content,
          timestamp: msg.createdAt.toISOString(),
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(formattedMessages, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid arguments: ${error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")}`
      );
    }
    throw error;
  }
});

// Start the server
async function main() {
  try {
    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Discord MCP Server running on stdio");
    
    // Set up cleanup on exit
    process.on('SIGINT', async () => {
      clientManager.destroyAll();
      await server.close();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      clientManager.destroyAll();
      await server.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
  }
}

main();
