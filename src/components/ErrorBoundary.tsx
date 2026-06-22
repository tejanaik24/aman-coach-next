"use client"

import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 max-w-sm">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="font-heading text-xl text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-500 mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={this.handleRetry}
              className="rounded-full bg-[#FFB800] px-6 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-[#B28000] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
