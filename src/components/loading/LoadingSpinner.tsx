import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse';
  className?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  className = '',
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex items-center space-x-1 ${className}`}>
            <div className={`${sizeClasses[size]} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} bg-primary rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'bars':
        return (
          <div className={`flex items-end space-x-1 ${className}`}>
            {[1, 2, 3, 4].map((bar) => (
              <div
                key={bar}
                className={`bg-primary animate-pulse`}
                style={{
                  width: size === 'sm' ? '3px' : size === 'md' ? '4px' : '6px',
                  height: `${12 + (bar * 4)}px`,
                  animationDelay: `${bar * 100}ms`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} bg-primary rounded-full animate-pulse ${className}`} />
        );
      
      default: // spinner
        return (
          <div className={`${sizeClasses[size]} ${className}`}>
            <svg
              className="animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {renderSpinner()}
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );
};