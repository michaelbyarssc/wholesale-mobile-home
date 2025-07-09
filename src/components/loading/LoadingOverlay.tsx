import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  isVisible: boolean;
  text?: string;
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse';
  className?: string;
  backdrop?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  text = 'Loading...',
  variant = 'spinner',
  className = '',
  backdrop = true
}) => {
  if (!isVisible) return null;

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      backdrop && 'bg-black/20 backdrop-blur-sm',
      className
    )}>
      <div className="bg-white rounded-lg shadow-lg p-6 mx-4">
        <LoadingSpinner 
          size="lg" 
          variant={variant}
          text={text}
          className="text-center"
        />
      </div>
    </div>
  );
};