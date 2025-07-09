import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const FiltersSkeleton: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton variant="circular" className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Search bar skeleton */}
        <div>
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-11 w-full" />
        </div>
        
        {/* Width type buttons skeleton */}
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((btn) => (
              <Skeleton key={btn} className="h-8" />
            ))}
          </div>
        </div>
        
        {/* Price range skeleton */}
        <div>
          <Skeleton className="h-4 w-40 mb-3" />
          <div className="px-2">
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
        
        {/* Square footage skeleton */}
        <div>
          <Skeleton className="h-4 w-36 mb-3" />
          <div className="px-2">
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
        
        {/* Checkboxes skeleton */}
        <div>
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((checkbox) => (
              <div key={checkbox} className="flex items-center space-x-2">
                <Skeleton variant="rectangular" className="h-5 w-5" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};