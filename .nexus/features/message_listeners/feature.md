# Message Listeners

## Context

Message listeners enable the Discord bot to monitor channels for specific keywords and respond automatically using configurable response handlers. This feature allows for creating automated responses to specific triggers in Discord conversations.

- [Link to system architecture](../../architecture/system_overview.md)

## Goal

Provide a flexible system for:

1. Creating keyword-based message listeners
2. Configuring response handlers for different types of responses
3. Managing active listeners

## Implementation

The feature is implemented through several MCP tools:

### 1. create_listener Tool

```typescript
server.addTool({
  name: "create_listener",
  description:
    "Create a new message listener with keywords and a predefined response handler",
  parameters: CreateListenerSchema,
  execute: async (args, context) => {
    // Implementation details
  },
});
```

**Parameters:**

- `server` (optional): Server name or ID
- `channel` (optional): Channel name or ID
- `keywords`: Array of keywords to listen for
- `handlerId`: ID of the response handler to use
- `handlerOptions` (optional): Options for the response handler
- `description` (optional): Description of this listener

### 2. remove_listener Tool

```typescript
server.addTool({
  name: "remove_listener",
  description: "Remove an existing message listener",
  parameters: RemoveListenerSchema,
  execute: async (args) => {
    // Implementation details
  },
});
```

**Parameters:**

- `listenerId`: ID of the listener to remove

### 3. list_listeners Tool

```typescript
server.addTool({
  name: "list_listeners",
  description: "List all active message listeners",
  parameters: ListListenersSchema,
  execute: async (args, context) => {
    // Implementation details
  },
});
```

### 4. list_handlers Tool

```typescript
server.addTool({
  name: "list_handlers",
  description: "List all available response handlers",
  parameters: ListHandlersSchema,
  execute: async () => {
    // Implementation details
  },
});
```

## Response Handlers

The system includes built-in response handlers:

### Acknowledgment Handler (ack)

A simple handler that replies to the user with an acknowledgment message.

```typescript
export const ackHandler: ResponseHandler = {
  id: "ack",
  name: "Acknowledgment",
  description: "Replies to the user with a simple acknowledgment message",
  handle: async (message: Message, client: Client, options?: any) => {
    // Implementation details
  },
};
```

### Echo Handler (echo)

A handler that echoes the user's message back to them.

```typescript
export const echoHandler: ResponseHandler = {
  id: "echo",
  name: "Echo",
  description: "Echoes the user's message back to them",
  handle: async (message: Message, client: Client, options?: any) => {
    // Implementation details
  },
};
```

## Key Components

- **Discord Client Manager**: Manages message listeners for each client
- **Response Handler Registry**: Stores and retrieves response handlers
- **Message Event Handling**: Processes incoming messages and triggers appropriate handlers

## Considerations/Open Questions

- Scalability: How many listeners can be active simultaneously without performance issues?
- Custom handlers: Process for adding new response handlers
- Persistence: Currently listeners are stored in memory, could be extended to persist across restarts

## AI Assistance Notes

- Model Used: Claude
- Prompt: Nexus Onboarding Assistant
- Date Generated: 2025-03-24

## Related Nexus Documents

- [System Overview](../../architecture/system_overview.md)
- [Discord Message Interaction](../message_interaction/feature.md)
