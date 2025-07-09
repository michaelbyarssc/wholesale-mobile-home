import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface MobileHomeCardSkeletonProps {
  count?: number;
}

export const MobileHomeCardSkeleton: React.FC<MobileHomeCardSkeletonProps> = ({ 
  count = 1 
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="overflow-hidden animate-fade-in">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
            
            {/* Description skeleton */}
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            
            {/* Price skeleton */}
            <div className="mt-4">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Image carousel skeleton */}
            <div className="relative">
              <Skeleton className="w-full h-48 rounded-lg" />
              
              {/* Carousel dots */}
              <div className="flex justify-center mt-3 gap-2">
                {[1, 2, 3].map((dot) => (
                  <Skeleton key={dot} variant="circular" className="h-2 w-2" />
                ))}
              </div>
            </div>

            {/* Specifications skeleton */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <Skeleton className="h-4 w-20 mx-auto mb-1" />
                <Skeleton className="h-5 w-16 mx-auto" />
              </div>
              <div className="text-center">
                <Skeleton className="h-4 w-20 mx-auto mb-1" />
                <Skeleton className="h-5 w-16 mx-auto" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Skeleton variant="circular" className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Skeleton variant="circular" className="h-4 w-4" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            {/* Features skeleton */}
            <div>
              <div className="flex items-center mb-2">
                <Skeleton variant="circular" className="h-4 w-4 mr-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="space-y-1">
                {[1, 2, 3].map((feature) => (
                  <div key={feature} className="flex items-center">
                    <Skeleton variant="circular" className="h-2 w-2 mr-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
};