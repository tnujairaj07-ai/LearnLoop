import { Component } from 'react'

// React unmounts the whole tree on an uncaught render error with no visual
// trace — the app just goes blank. This boundary catches that instead and
// shows something the user can act on (reload / go back to login).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error in app tree:', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-sunken px-6 text-center">
          <p className="font-serif text-xl font-semibold text-ink">Something went wrong</p>
          <p className="max-w-sm text-sm text-ink-faint">
            {this.state.error.message || 'The page hit an unexpected error and could not continue.'}
          </p>
          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => window.location.assign('/login')}>
              Back to login
            </button>
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
