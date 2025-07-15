export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface BaseLogContext {
  correlationId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface LogEntry {
  correlationId?: string
  timestamp: string
  level: LogLevel
  message: string
  context?: BaseLogContext
}

// Factory functions for creating loggers
export const createLogger = (
  defaultContext: BaseLogContext = {},
  adapter?: LogAdapter
): Logger => {
  return new Logger(defaultContext, adapter)
}

// Adapter interface for different logging libs
export interface LogAdapter {
  write(logEntry: LogEntry): void
}

// Console adapter (default)
export class ConsoleLogAdapter implements LogAdapter {
  write(logEntry: LogEntry): void {
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (isDevelopment) {
      const { timestamp, level, message, context } = logEntry
      console[level === 'info' ? 'log' : level](
        `[${timestamp}] ${level.toUpperCase()}: ${message}`,
        context
      )
      return
    }

    const logString = JSON.stringify(logEntry)

    switch (logEntry.level) {
      case 'error':
        console.error(logString)
        break
      case 'warn':
        console.warn(logString)
        break
      case 'debug':
        console.debug(logString)
        break
      default:
        console.log(logString)
    }
  }
}

export class Logger {
  private defaultContext: BaseLogContext = {}
  private adapter: LogAdapter

  constructor(defaultContext: BaseLogContext = {}, adapter?: LogAdapter) {
    this.defaultContext = defaultContext
    this.adapter = adapter || new ConsoleLogAdapter()
  }

  private formatLog(
    level: LogLevel,
    message: string,
    context?: BaseLogContext
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...this.defaultContext,
        ...context,
      },
    }
  }

  info(message: string, context?: BaseLogContext) {
    this.adapter.write(this.formatLog('info', message, context))
  }

  warn(message: string, context?: BaseLogContext) {
    this.adapter.write(this.formatLog('warn', message, context))
  }

  error(message: string, context?: BaseLogContext) {
    this.adapter.write(this.formatLog('error', message, context))
  }

  debug(message: string, context?: BaseLogContext) {
    this.adapter.write(this.formatLog('debug', message, context))
  }

  child(additionalContext: BaseLogContext): Logger {
    return new Logger({
      ...this.defaultContext,
      ...additionalContext,
    })
  }

  addContext(context: BaseLogContext): void {
    this.defaultContext = {
      ...this.defaultContext,
      ...context,
    }
  }
}
