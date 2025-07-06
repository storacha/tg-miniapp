export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface JobLogContext {
  jobId?: string
  userId?: string
  step?: string
  phase?: string
  correlationId?: string
  dialogId?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export function logJobEvent({
  level = 'info',
  message,
  ...context
}: {
  level?: LogLevel
  message: string
} & JobLogContext) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  }

  if (level === 'error') {
    console.error(JSON.stringify(log))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(log))
  } else if (level === 'debug') {
    console.debug(JSON.stringify(log))
  } else {
    console.log(JSON.stringify(log))
  }
}
