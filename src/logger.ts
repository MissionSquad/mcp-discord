import { config } from './config.js'

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

export const logger = {
  error: (message: string, ...args: any[]) => {
    if (logLevels[config.logLevel] >= logLevels.error) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (logLevels[config.logLevel] >= logLevels.warn) {
      console.error(`[WARN] ${message}`, ...args)
    }
  },
  info: (message: string, ...args: any[]) => {
    if (logLevels[config.logLevel] >= logLevels.info) {
      console.error(`[INFO] ${message}`, ...args)
    }
  },
  debug: (message: string, ...args: any[]) => {
    if (logLevels[config.logLevel] >= logLevels.debug) {
      console.error(`[DEBUG] ${message}`, ...args)
    }
  },
}
