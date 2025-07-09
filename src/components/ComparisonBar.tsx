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
      "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-right",
      className
    )}>
      <Card className="shadow-lg border-2 border-blue-200 bg-white/95 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center gap-4">
            {/* Title */}
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-900">
                Compare Homes
              </span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {homes.length}
              </Badge>
            </div>

            {/* Home Pills */}
            <div className="flex items-center gap-2 max-w-md overflow-x-auto">
              {homes.map((home) => (
                <div
                  key={home.id}
                  className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-sm whitespace-nowrap"
                >
                  <span className="max-w-32 truncate">
                    {getHomeName(home)}
                  </span>
                  <button
                    onClick={() => onRemoveHome(home.id)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                onClick={onViewComparison}
                className="flex items-center gap-2"
                disabled={homes.length === 0}
              >
                <Eye className="h-4 w-4" />
                Compare ({homes.length})
              </Button>
              <Button
                onClick={onClearAll}
                variant="outline"
                size="sm"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};