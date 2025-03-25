# Discord Message Interaction

## Context

This feature enables LLMs to send messages to and read messages from Discord channels through the MCP protocol. It's a core functionality that allows AI assistants to interact with Discord users.

- [Link to system architecture](../../architecture/system_overview.md)

## Goal

Provide a reliable and easy-to-use interface for LLMs to:

1. Send messages to specific Discord channels
2. Read recent messages from Discord channels

## Implementation

The feature is implemented through two MCP tools:

### 1. send_message Tool

```typescript
server.addTool({
  name: "send_message",
  description: "Send a message to a Discord channel",
  parameters: SendMessageSchema,
  execute: async (args, context) => {
    // Implementation details
  },
});
```

**Parameters:**

- `server` (optional): Server name or ID (optional if bot is only in one server)
- `channel`: Channel name (e.g., "general") or ID
- `message`: The message to send

### 2. read_messages Tool

```typescript
server.addTool({
  name: "read_messages",
  description: "Read recent messages from a Discord channel",
  parameters: ReadMessagesSchema,
  execute: async (args, context) => {
    // Implementation details
  },
});
```

**Parameters:**

- `server` (optional): Server name or ID (optional if bot is only in one server)
- `channel`: Channel name (e.g., "general") or ID
- `limit` (optional): Number of messages to retrieve (default: 50, max: 100)

## Key Components

- **Discord Client Manager**: Handles finding the appropriate channel and server
- **Error Handling**: Robust error handling for Discord API interactions
- **Authentication**: Uses Discord bot token for authentication

## Considerations/Open Questions

- Rate limiting: Discord API has rate limits that need to be considered for high-volume usage
- Message formatting: Currently sends plain text, could be extended to support rich embeds
- Pagination: For reading large numbers of messages beyond the 100 message limit

## AI Assistance Notes

- Model Used: Claude
- Prompt: Nexus Onboarding Assistant
- Date Generated: 2025-03-24

## Related Nexus Documents

- [System Overview](../../architecture/system_overview.md)
- [Discord.js Technology Choice](../../decisions/technology_choices/main_technologies.md)
