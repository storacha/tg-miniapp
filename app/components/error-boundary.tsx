import {
  Component,
  type ComponentType,
  type GetDerivedStateFromError,
  type PropsWithChildren,
} from 'react'
import * as Sentry from '@sentry/nextjs'

export interface ErrorBoundaryProps extends PropsWithChildren {
  fallback: ComponentType<{ error: Error }>
}

interface ErrorBoundaryState {
  error?: Error
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {}

  static getDerivedStateFromError: GetDerivedStateFromError<
    ErrorBoundaryProps,
    ErrorBoundaryState
  > = (error) => ({
    error,
  })

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture error in Sentry with additional context
    Sentry.withScope((scope) => {
      // Add React error boundary context
      scope.setTag('errorBoundary', 'main-app')
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack,
      })

      // Capture the error
      Sentry.captureException(error)
    })

    this.setState({ error })
  }

  render() {
    const {
      state: { error },
      props: { fallback: Fallback, children },
    } = this

    return error ? <Fallback error={error} /> : children
  }
}
