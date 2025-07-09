import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const TabsSkeleton: React.FC = () => {
  return (
    <div className="mb-6">
      {/* Tabs list skeleton */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[1, 2, 3].map((tab) => (
          <Skeleton key={tab} className="h-10 w-24" />
        ))}
      </div>
      
      {/* Results count skeleton */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>
    </div>
  );
};