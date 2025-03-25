# Slash Commands

## Context

Slash commands provide a user-friendly way for Discord users to interact with the bot using Discord's built-in command system. This feature allows for registering custom slash commands and handling user interactions with those commands.

- [Link to system architecture](../../architecture/system_overview.md)

## Goal

Enable the Discord bot to:

1. Register custom slash commands to Discord servers
2. Handle user interactions with those commands
3. Provide appropriate responses and execute command-specific logic

## Implementation

The feature is implemented through:

### 1. register_commands MCP Tool

```typescript
server.addTool({
  name: "register_commands",
  description: "Register slash commands for a Discord bot",
  parameters: RegisterCommandsSchema,
  execute: async (args, context) => {
    // Implementation details
  },
});
```

**Parameters:**

- `server` (optional): Server ID to register commands to (optional, if not provided commands will be registered globally)

### 2. Command Definitions

Commands are defined in `src/slash-commands/commands.ts`:

```typescript
export const pingCommandData: ApplicationCommandData = {
  name: "ping",
  description: "Replies with Pong!",
};

export const kickCommandData: ApplicationCommandData = {
  name: "kick",
  description: "Kick a user from the server",
  options: [
    {
      name: "target",
      description: "The user to kick",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "reason",
      description: "Reason for kicking",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ],
};

// Additional commands defined but commented out in the code
```

### 3. Command Handlers

Command handlers in `src/slash-commands/handlers.ts` process user interactions:

```typescript
// Handle the ping command
async function handlePing(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.reply("Pong!");
}

// Handle a command interaction
async function handleCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const { commandName } = interaction;

  switch (commandName) {
    case "ping":
      await handlePing(interaction);
      break;
    // Other command handlers
    default:
      await interaction.reply({
        content: "Unknown command",
        ephemeral: true,
      });
  }
}
```

## Key Components

- **Command Definitions**: Define the structure and options for each command
- **Command Handlers**: Process user interactions with commands
- **Permission Checking**: Verify user permissions for moderation commands
- **Interaction Setup**: Register interaction handlers with the Discord client

## Considerations/Open Questions

- Command Scope: Global vs. server-specific commands
- Permission Management: How to handle commands that require specific permissions
- Command Cooldowns: Potential implementation of cooldowns for certain commands
- Command Categories: Organizing commands into logical groups

## AI Assistance Notes

- Model Used: Claude
- Prompt: Nexus Onboarding Assistant
- Date Generated: 2025-03-24

## Related Nexus Documents

- [System Overview](../../architecture/system_overview.md)
- [Discord.js Technology Choice](../../decisions/technology_choices/main_technologies.md)
