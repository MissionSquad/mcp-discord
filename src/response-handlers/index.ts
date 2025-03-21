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
