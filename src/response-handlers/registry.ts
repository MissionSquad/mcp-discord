import { ResponseHandler } from '../types.js'

/**
 * Registry for response handlers
 */
export class ResponseHandlerRegistry {
  private handlers: Map<string, ResponseHandler> = new Map()
  
  /**
   * Register a new handler
   * @param handler The handler to register
   */
  register(handler: ResponseHandler): void {
    this.handlers.set(handler.id, handler)
  }
  
  /**
   * Get a handler by ID
   * @param id The handler ID
   * @returns The handler or undefined if not found
   */
  getHandler(id: string): ResponseHandler | undefined {
    return this.handlers.get(id)
  }
  
  /**
   * List all available handlers
   * @returns Array of all registered handlers
   */
  listHandlers(): ResponseHandler[] {
    return Array.from(this.handlers.values())
  }
}

// Create a singleton instance
export const responseHandlerRegistry = new ResponseHandlerRegistry()
