import { Component, ErrorInfo, ReactNode } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
          <Card className="w-full max-w-md">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-semibold text-text-primary mb-2">Something went wrong</h1>
              <p className="text-text-secondary mb-6">
                We encountered an unexpected error. Please try reloading the application.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="primary" onClick={this.handleReload}>
                  Reload App
                </Button>
                <Button variant="outline" onClick={this.handleReset}>
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

