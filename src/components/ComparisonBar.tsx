import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { X, Scale, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface ComparisonBarProps {
  homes: MobileHome[];
  onRemoveHome: (homeId: string) => void;
  onViewComparison: () => void;
  onClearAll: () => void;
  className?: string;
}

export const ComparisonBar: React.FC<ComparisonBarProps> = ({
  homes,
  onRemoveHome,
  onViewComparison,
  onClearAll,
  className
}) => {
  const getHomeName = (home: MobileHome) => {
    return home.display_name || `${home.manufacturer} ${home.model}`;
  };

  if (homes.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-right px-4 max-w-full",
      className
    )}>
      <Card className="shadow-lg border-2 border-blue-200 bg-white/95 backdrop-blur-sm max-w-4xl">
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Title */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
              <Scale className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="font-semibold text-gray-900 text-sm sm:text-base hidden sm:inline">
                Compare Homes
              </span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs sm:text-sm">
                {homes.length}
              </Badge>
            </div>

            {/* Home Pills - Scrollable on mobile */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto flex-1 min-w-0">
              {homes.map((home) => (
                <div
                  key={home.id}
                  className="flex items-center gap-1 bg-gray-100 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <span className="max-w-16 sm:max-w-32 truncate">
                    {getHomeName(home)}
                  </span>
                  <button
                    onClick={() => onRemoveHome(home.id)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors touch-manipulation"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                onClick={onViewComparison}
                className="flex items-center gap-1 sm:gap-2 touch-manipulation text-xs sm:text-sm px-2 sm:px-4"
                disabled={homes.length === 0}
                size="sm"
              >
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Compare ({homes.length})</span>
                <span className="sm:hidden">Compare</span>
              </Button>
              <Button
                onClick={onClearAll}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm px-2 sm:px-3 touch-manipulation"
              >
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};