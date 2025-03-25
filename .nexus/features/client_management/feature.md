# Discord Client Management

## Context

The Discord Client Manager is a core component that handles the creation, management, and cleanup of Discord.js clients. It provides a centralized way to manage multiple Discord bot instances, each with their own token and set of listeners.

- [Link to system architecture](../../architecture/system_overview.md)

## Goal

Provide a robust system for:

1. Creating and managing Discord.js clients
2. Finding Discord servers (guilds) and channels
3. Managing the lifecycle of clients and their resources
4. Handling authentication and connection to Discord

## Implementation

The client manager is implemented in `src/discord-client-manager.ts` as a class with various methods:

```typescript
export class DiscordClientManager {
  private clients: Map<string, ClientInfo> = new Map();
  private readonly cleanupInterval: number;
  private readonly clientOptions: ClientOptions;

  constructor(options?: {
    cleanupInterval?: number;
    intents?: GatewayIntentBits[];
  }) {
    // Implementation details
  }

  // Methods for client management
  public async getClient(token: string): Promise<Client> {
    // Implementation details
  }

  // Methods for finding Discord resources
  public async findGuild(client: Client, guildIdentifier?: string) {
    // Implementation details
  }

  public async findChannel(
    client: Client,
    channelIdentifier: string,
    guildIdentifier?: string
  ): Promise<TextChannel> {
    // Implementation details
  }

  // Methods for listener management
  public async addListener(
    token: string,
    options: ListenerOptions
  ): Promise<string> {
    // Implementation details
  }

  public removeListener(listenerId: string): boolean {
    // Implementation details
  }

  public getListeners(token?: string): ListenerInfo[] {
    // Implementation details
  }

  // Cleanup methods
  private cleanupInactiveClients(): void {
    // Implementation details
  }

  public destroyAll(): void {
    // Implementation details
  }
}
```

## Key Components

### Client Creation and Caching

The manager maintains a cache of Discord clients indexed by their token, creating new clients only when necessary and reusing existing ones when possible.

### Resource Finding

Helper methods to find Discord guilds and channels by name or ID, with robust error handling and user-friendly error messages.

### Listener Management

Methods to add, remove, and list message listeners for each client.

### Automatic Cleanup

A timer-based system to clean up inactive clients and free resources, plus explicit cleanup methods for application shutdown.

## Considerations/Open Questions

- Scalability: How many concurrent Discord clients can be efficiently managed?
- Token Security: How to securely handle Discord tokens
- Error Recovery: Strategies for handling Discord API errors and rate limits
- State Persistence: Currently state is in-memory only, could be extended to persist across restarts

## AI Assistance Notes

- Model Used: Claude
- Prompt: Nexus Onboarding Assistant
- Date Generated: 2025-03-24

## Related Nexus Documents

- [System Overview](../../architecture/system_overview.md)
- [Message Listeners](../message_listeners/feature.md)
- [Discord.js Technology Choice](../../decisions/technology_choices/main_technologies.md)
