import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class MobileHomesErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 MOBILE HOMES ERROR BOUNDARY:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    console.log('🔄 ERROR BOUNDARY: Retrying...');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    console.log('🔄 ERROR BOUNDARY: Reloading page...');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <section className="py-20 bg-amber-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Mobile Homes Loading Error
                </h3>
                <p className="text-red-600 mb-6 text-sm">
                  We encountered an issue loading the mobile home listings. 
                  This might be due to a temporary connection problem or authentication issue.
                </p>
                
                <div className="space-y-3">
                  <Button 
                    onClick={this.handleRetry} 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button 
                    onClick={this.handleReload} 
                    variant="default" 
                    size="sm"
                    className="w-full"
                  >
                    Reload Page
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="text-xs text-gray-500 cursor-pointer">
                      Error Details (Dev Mode)
                    </summary>
                    <pre className="text-xs text-gray-600 mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-32">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}