import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const HeaderSkeleton: React.FC = () => {
  return (
    <header className="bg-white shadow-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3 lg:py-4">
          {/* Left side skeleton */}
          <div className="flex-1 min-w-0">
            <div className="mb-2 lg:mb-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-1 w-16 mt-2 bg-blue-200" />
            </div>
            
            {/* Contact info skeleton */}
            <div className="hidden md:flex flex-col lg:flex-row gap-2 lg:gap-6">
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="h-8 w-8" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="h-8 w-8" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>

          {/* Right side skeleton */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-10 w-10" />
          </div>
        </div>
      </div>
    </header>
  );
};