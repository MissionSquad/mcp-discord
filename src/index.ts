#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from 'dotenv';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { 
  Client, 
  GatewayIntentBits, 
  TextChannel, 
  ClientOptions, 
  Interaction, 
  ChatInputCommandInteraction,
  ApplicationCommandOptionType,
  GuildMember,
  PermissionFlagsBits,
  Collection,
  ApplicationCommandData
} from 'discord.js';
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
      GatewayIntentBits.GuildModeration,
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
      
      // Set up interaction handlers
      this.setupInteractionHandlers(client);
      
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

  /**
   * Register slash commands for a Discord bot
   */
  public async registerCommands(token: string, guildId?: string): Promise<Collection<string, any>> {
    const client = await this.getClient(token);
    
    // Wait for client to be ready
    if (!client.isReady()) {
      await new Promise<void>((resolve) => {
        const readyListener = () => {
          resolve();
          client.removeListener('ready', readyListener);
        };
        client.on('ready', readyListener);
        
        // If client is already ready, resolve immediately
        if (client.isReady()) {
          resolve();
        }
      });
    }
    
    // Define commands
    const commands: ApplicationCommandData[] = [
      {
        name: 'ping',
        description: 'Replies with Pong!'
      },
      {
        name: 'kick',
        description: 'Kick a user from the server',
        options: [
          {
            name: 'target',
            description: 'The user to kick',
            type: ApplicationCommandOptionType.User,
            required: true
          },
          {
            name: 'reason',
            description: 'Reason for kicking',
            type: ApplicationCommandOptionType.String,
            required: false
          }
        ]
      },
      {
        name: 'ban',
        description: 'Ban a user from the server',
        options: [
          {
            name: 'target',
            description: 'The user to ban',
            type: ApplicationCommandOptionType.User,
            required: true
          },
          {
            name: 'reason',
            description: 'Reason for banning',
            type: ApplicationCommandOptionType.String,
            required: false
          }
        ]
      },
      {
        name: 'slowmode',
        description: 'Set slowmode for the current channel',
        options: [
          {
            name: 'seconds',
            description: 'Slowmode delay in seconds (0 to disable)',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            min_value: 0,
            max_value: 21600 // 6 hours
          }
        ]
      }
    ];

    // Register commands to a specific guild or globally
    if (guildId) {
      const guild = await client.guilds.fetch(guildId);
      return await guild.commands.set(commands);
    } else {
      if (!client.application) {
        throw new Error('Client application is not available');
      }
      return await client.application.commands.set(commands);
    }
  }

  /**
   * Set up interaction handlers for a Discord client
   */
  private setupInteractionHandlers(client: Client): void {
    client.on('interactionCreate', async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return;
      
      try {
        await this.handleCommand(interaction);
      } catch (error) {
        console.error('Error handling command:', error);
        
        // Only reply if the interaction hasn't been replied to yet
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: 'An error occurred while executing this command.', 
            ephemeral: true 
          }).catch(console.error);
        } else {
          await interaction.reply({ 
            content: 'An error occurred while executing this command.', 
            ephemeral: true 
          }).catch(console.error);
        }
      }
    });
  }

  /**
   * Handle a command interaction
   */
  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const { commandName } = interaction;

    switch (commandName) {
      case 'ping':
        await this.handlePing(interaction);
        break;
      case 'kick':
        await this.handleKick(interaction);
        break;
      case 'ban':
        await this.handleBan(interaction);
        break;
      case 'slowmode':
        await this.handleSlowmode(interaction);
        break;
      default:
        await interaction.reply({ 
          content: 'Unknown command', 
          ephemeral: true 
        });
    }
  }

  /**
   * Handle the ping command
   */
  private async handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply('Pong!');
  }

  /**
   * Handle the kick command
   */
  private async handleKick(interaction: ChatInputCommandInteraction): Promise<void> {
    // Only run in a guild
    if (!interaction.guild) {
      await interaction.reply({ 
        content: 'This command can only be used in a server.', 
        ephemeral: true 
      });
      return;
    }

    // Check if the user has permission to kick
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({ 
        content: 'You do not have permission to kick users.', 
        ephemeral: true 
      });
      return;
    }

    const targetUser = interaction.options.getUser('target');
    if (!targetUser) {
      await interaction.reply({ 
        content: 'Invalid user.', 
        ephemeral: true 
      });
      return;
    }

    const targetMember = interaction.options.getMember('target') as GuildMember | null;
    if (!targetMember) {
      await interaction.reply({ 
        content: 'User is not in this server.', 
        ephemeral: true 
      });
      return;
    }

    // Check if the bot can kick the user
    if (!targetMember.kickable) {
      await interaction.reply({ 
        content: 'I do not have permission to kick this user.', 
        ephemeral: true 
      });
      return;
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await targetMember.kick(reason);
      await interaction.reply(`Successfully kicked ${targetUser.tag} for reason: ${reason}`);
    } catch (error) {
      console.error('Error kicking user:', error);
      await interaction.reply({ 
        content: 'Failed to kick user. Please check my permissions and try again.', 
        ephemeral: true 
      });
    }
  }

  /**
   * Handle the ban command
   */
  private async handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
    // Only run in a guild
    if (!interaction.guild) {
      await interaction.reply({ 
        content: 'This command can only be used in a server.', 
        ephemeral: true 
      });
      return;
    }

    // Check if the user has permission to ban
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({ 
        content: 'You do not have permission to ban users.', 
        ephemeral: true 
      });
      return;
    }

    const targetUser = interaction.options.getUser('target');
    if (!targetUser) {
      await interaction.reply({ 
        content: 'Invalid user.', 
        ephemeral: true 
      });
      return;
    }

    const targetMember = interaction.options.getMember('target') as GuildMember | null;
    if (targetMember && !targetMember.bannable) {
      await interaction.reply({ 
        content: 'I do not have permission to ban this user.', 
        ephemeral: true 
      });
      return;
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.guild.members.ban(targetUser, { reason });
      await interaction.reply(`Successfully banned ${targetUser.tag} for reason: ${reason}`);
    } catch (error) {
      console.error('Error banning user:', error);
      await interaction.reply({ 
        content: 'Failed to ban user. Please check my permissions and try again.', 
        ephemeral: true 
      });
    }
  }

  /**
   * Handle the slowmode command
   */
  private async handleSlowmode(interaction: ChatInputCommandInteraction): Promise<void> {
    // Only run in a guild
    if (!interaction.guild) {
      await interaction.reply({ 
        content: 'This command can only be used in a server.', 
        ephemeral: true 
      });
      return;
    }

    // Check if the user has permission to manage channels
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ 
        content: 'You do not have permission to manage channels.', 
        ephemeral: true 
      });
      return;
    }

    // Check if the channel is a text channel
    if (!interaction.channel || !('setRateLimitPerUser' in interaction.channel)) {
      await interaction.reply({ 
        content: 'This command can only be used in a text channel.', 
        ephemeral: true 
      });
      return;
    }

    const seconds = interaction.options.getInteger('seconds', true);
    
    try {
      await interaction.channel.setRateLimitPerUser(seconds, 'Slowmode set via slash command');
      
      if (seconds === 0) {
        await interaction.reply('Slowmode has been disabled for this channel.');
      } else {
        await interaction.reply(`Slowmode has been set to ${seconds} second(s) for this channel.`);
      }
    } catch (error) {
      console.error('Error setting slowmode:', error);
      await interaction.reply({ 
        content: 'Failed to set slowmode. Please check my permissions and try again.', 
        ephemeral: true 
      });
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

// Validation schemas
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

const RegisterCommandsSchema = z.object({
  token: z.string().describe('Discord bot token'),
  server: z.string().optional().describe('Server ID to register commands to (optional, if not provided commands will be registered globally)'),
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
          required: ["channel", "message"],
        },
      },
      {
        name: "read-messages",
        description: "Read recent messages from a Discord channel",
        inputSchema: {
          type: "object",
          properties: {
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
          required: ["channel"],
        },
      },
      {
        name: "register-commands",
        description: "Register slash commands for a Discord bot",
        inputSchema: {
          type: "object",
          properties: {
            server: {
              type: "string",
              description: 'Server ID to register commands to (optional, if not provided commands will be registered globally)',
            },
          },
          required: [],
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

      case "register-commands": {
        const { token, server: serverId } = RegisterCommandsSchema.parse(args);
        
        try {
          const commands = await clientManager.registerCommands(token, serverId);
          
          return {
            content: [{
              type: "text",
              text: `Successfully registered ${commands.size} slash commands${serverId ? ` to server ${serverId}` : ' globally'}.`,
            }],
          };
        } catch (error) {
          console.error('Error registering commands:', error);
          throw new Error(`Failed to register commands: ${error instanceof Error ? error.message : String(error)}`);
        }
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
