import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info?.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-chai-50 px-6 text-center">
          <h1 className="text-lg font-semibold text-chai-900">Something went wrong</h1>
          <p className="mt-2 max-w-md text-sm text-chai-600">
            The app hit an unexpected error. You can try again — your data on the server is unchanged.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-6 rounded-xl bg-chai-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-chai-700"
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
