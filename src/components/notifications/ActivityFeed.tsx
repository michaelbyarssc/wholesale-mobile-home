import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { formatDistanceToNow } from 'date-fns';
import { 
  User, 
  Home, 
  FileText, 
  Settings, 
  Plus, 
  Edit, 
  Trash, 
  Check, 
  X,
  Activity
} from 'lucide-react';

const entityIcons = {
  estimate: FileText,
  mobile_home: Home,
  user: User,
  system: Settings,
};

const actionIcons = {
  created: Plus,
  updated: Edit,
  deleted: Trash,
  approved: Check,
  rejected: X,
};

const actionColors = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-orange-100 text-orange-800',
};

export function ActivityFeed() {
  const { activities, isLoading } = useActivityFeed();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-4 p-6">
            {activities.map((activity) => {
              const EntityIcon = entityIcons[activity.entity_type as keyof typeof entityIcons] || Activity;
              const ActionIcon = actionIcons[activity.action as keyof typeof actionIcons] || Activity;
              
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                      <EntityIcon className="h-4 w-4" />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={actionColors[activity.action as keyof typeof actionColors] || 'bg-gray-100 text-gray-800'}
                      >
                        <ActionIcon className="h-3 w-3 mr-1" />
                        {activity.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">
                        {activity.entity_type.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground">
                      {activity.description}
                    </p>
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}