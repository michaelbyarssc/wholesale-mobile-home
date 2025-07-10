import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, Eye, Clock, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface PopularHomesProps {
  title?: string;
  showViewCounts?: boolean;
  limit?: number;
  className?: string;
}

interface PopularHomeData {
  mobile_home: MobileHome;
  view_count: number;
  total_time_spent: number;
  avg_time_spent: number;
  recent_views: number;
}

export const PopularHomes: React.FC<PopularHomesProps> = ({
  title = "Trending Mobile Homes",
  showViewCounts = true,
  limit = 4,
  className = ""
}) => {
  const navigate = useNavigate();

  const { data: popularHomes, isLoading } = useQuery({
    queryKey: ['popular-homes', limit],
    queryFn: async () => {
      // Get popular homes based on recent views and engagement
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: viewData, error: viewError } = await supabase
        .from('analytics_mobile_home_views')
        .select(`
          mobile_home_id,
          time_spent,
          created_at,
          mobile_homes!inner (*)
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('mobile_homes.active', true);

      if (viewError) throw viewError;

      // Aggregate data by mobile home
      const homeStats = new Map<string, {
        mobile_home: MobileHome;
        view_count: number;
        total_time_spent: number;
        recent_views: number;
      }>();

      viewData?.forEach(view => {
        const homeId = view.mobile_home_id;
        const home = view.mobile_homes;
        const timeSpent = view.time_spent || 0;
        
        if (!homeStats.has(homeId)) {
          homeStats.set(homeId, {
            mobile_home: home,
            view_count: 0,
            total_time_spent: 0,
            recent_views: 0
          });
        }
        
        const stats = homeStats.get(homeId)!;
        stats.view_count += 1;
        stats.total_time_spent += timeSpent;
        
        // Count views from last 7 days as "recent"
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (new Date(view.created_at) >= sevenDaysAgo) {
          stats.recent_views += 1;
        }
      });

      // Convert to array and sort by engagement score
      const result: PopularHomeData[] = Array.from(homeStats.values())
        .map(stats => ({
          ...stats,
          avg_time_spent: stats.view_count > 0 ? stats.total_time_spent / stats.view_count : 0
        }))
        .sort((a, b) => {
          // Calculate engagement score: recent views + view count + avg time engagement
          const scoreA = (a.recent_views * 3) + a.view_count + (a.avg_time_spent / 60);
          const scoreB = (b.recent_views * 3) + b.view_count + (b.avg_time_spent / 60);
          return scoreB - scoreA;
        })
        .slice(0, limit);

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });

  const formatTimeSpent = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!popularHomes || popularHomes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No trending data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-orange-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {popularHomes.map((homeData, index) => {
            const { mobile_home, view_count, avg_time_spent, recent_views } = homeData;
            const homeName = mobile_home.display_name || `${mobile_home.manufacturer} ${mobile_home.model}`;
            
            return (
              <div
                key={mobile_home.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/mobile-home/${mobile_home.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <h4 className="font-medium text-sm">{homeName}</h4>
                    {recent_views > 0 && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                        <Heart className="h-3 w-3 mr-1" />
                        Hot
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-green-600 font-medium">
                      ${mobile_home.price.toLocaleString()}
                    </span>
                    
                    {showViewCounts && (
                      <>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {view_count} views
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeSpent(avg_time_spent)} avg
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" className="text-xs">
                  View
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};