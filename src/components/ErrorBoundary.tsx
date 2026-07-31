import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tx } from '@/i18n/t';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI ErrorBoundary caught an error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-5 rounded-xl border border-border bg-card p-8 shadow-lg">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground">{tx('errors.boundaryTitle')}</h1>
            <p className="text-sm text-muted-foreground">{tx('errors.boundaryDescription')}</p>
          </div>
          {this.state.error?.message && (
            <p className="text-xs font-mono text-muted-foreground bg-muted rounded-md p-3 break-words">
              {this.state.error.message}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Button onClick={this.handleReset} variant="outline">
              {tx('errors.tryAgain')}
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="w-4 h-4 me-2" />
              {tx('errors.reload')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
