'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Button from '../../../components/Button';

interface Props {
  children: ReactNode;
  /** Name of the tab/section for error reporting */
  tabName?: string;
  /** Custom fallback UI */
  fallback?: ReactNode;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary for admin portal tabs
 *
 * Catches JavaScript errors in child components and displays
 * a fallback UI instead of crashing the whole app.
 *
 * Usage:
 * <AdminErrorBoundary tabName="Finance">
 *   <FinanceTab />
 * </AdminErrorBoundary>
 */
export class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console
    console.error(`[AdminErrorBoundary${this.props.tabName ? ` - ${this.props.tabName}` : ''}]`, error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-gray-50 rounded-lg">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
              {this.props.tabName && ` in ${this.props.tabName}`}
            </h2>
            <p className="text-gray-600 mb-6">
              An error occurred while loading this section. You can try again or contact support if the problem persists.
            </p>

            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry}>
                Try Again
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>

            {/* Error details (collapsed by default) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Show error details
                </summary>
                <div className="mt-2 p-4 bg-red-50 rounded border border-red-200 overflow-auto">
                  <p className="font-mono text-sm text-red-800 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  tabName?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <AdminErrorBoundary tabName={tabName}>
        <WrappedComponent {...props} />
      </AdminErrorBoundary>
    );
  };
}

export default AdminErrorBoundary;
