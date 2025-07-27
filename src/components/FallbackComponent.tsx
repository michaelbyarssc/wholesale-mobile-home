import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface FallbackComponentProps {
  error?: Error;
  resetError?: () => void;
  message?: string;
}

export const FallbackComponent = ({ 
  error, 
  resetError, 
  message = "Something went wrong while loading this page."
}: FallbackComponentProps) => {
  const handleRefresh = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">
            {message}
          </p>
          {error && (
            <details className="text-left bg-gray-100 p-3 rounded mb-4">
              <summary className="cursor-pointer text-sm font-medium">
                Technical details
              </summary>
              <pre className="text-xs mt-2 overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Go to Home Page
          </Button>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  );
};