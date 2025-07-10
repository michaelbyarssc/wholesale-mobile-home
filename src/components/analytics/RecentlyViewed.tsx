import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface RecentlyViewedProps {
  title?: string;
  limit?: number;
  className?: string;
}

interface ViewedHome {
  home: MobileHome;
  viewedAt: Date;
  viewCount: number;
}

const RECENT_VIEWS_KEY = 'recent-home-views';

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  title = "Recently Viewed",
  limit = 4,
  className = ""
}) => {
  const navigate = useNavigate();
  const [recentlyViewed, setRecentlyViewed] = React.useState<ViewedHome[]>([]);

  // Load recently viewed homes from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_VIEWS_KEY);
      if (stored) {
        const data = JSON.parse(stored) as ViewedHome[];
        // Filter out items older than 30 days and convert dates
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const filtered = data
          .map(item => ({
            ...item,
            viewedAt: new Date(item.viewedAt)
          }))
          .filter(item => item.viewedAt >= thirtyDaysAgo)
          .slice(0, limit);
        
        setRecentlyViewed(filtered);
      }
    } catch (error) {
      console.error('Error loading recently viewed homes:', error);
    }
  }, [limit]);

  const formatViewTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Recently';
    }
  };

  const clearRecentlyViewed = () => {
    localStorage.removeItem(RECENT_VIEWS_KEY);
    setRecentlyViewed([]);
  };

  if (recentlyViewed.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4 text-sm">
            No recently viewed homes yet. Start exploring our mobile homes to see them here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            {title}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearRecentlyViewed}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentlyViewed.map((viewedHome, index) => {
            const { home, viewedAt, viewCount } = viewedHome;
            const homeName = home.display_name || `${home.manufacturer} ${home.model}`;
            
            return (
              <div
                key={`${home.id}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/mobile-home/${home.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{homeName}</h4>
                    {viewCount > 1 && (
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        {viewCount}x
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">
                      ${home.price.toLocaleString()}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatViewTime(viewedAt)}
                    </div>
                    
                    <Badge variant="secondary" className="text-xs">
                      {home.series}
                    </Badge>
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" className="text-xs">
                  View Again
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to add a home to recently viewed (call this from mobile home detail pages)
export const addToRecentlyViewed = (home: MobileHome) => {
  try {
    const stored = localStorage.getItem(RECENT_VIEWS_KEY);
    let recentViews: ViewedHome[] = stored ? JSON.parse(stored) : [];
    
    // Check if home already exists
    const existingIndex = recentViews.findIndex(item => item.home.id === home.id);
    
    if (existingIndex >= 0) {
      // Update existing entry
      recentViews[existingIndex] = {
        ...recentViews[existingIndex],
        viewedAt: new Date(),
        viewCount: recentViews[existingIndex].viewCount + 1
      };
      // Move to front
      const updatedItem = recentViews.splice(existingIndex, 1)[0];
      recentViews.unshift(updatedItem);
    } else {
      // Add new entry
      recentViews.unshift({
        home,
        viewedAt: new Date(),
        viewCount: 1
      });
    }
    
    // Keep only the most recent 10 items
    recentViews = recentViews.slice(0, 10);
    
    localStorage.setItem(RECENT_VIEWS_KEY, JSON.stringify(recentViews));
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
  }
};
