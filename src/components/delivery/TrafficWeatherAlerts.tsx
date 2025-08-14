import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, AlertTriangle, Navigation, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrafficWeatherAlertsProps {
  deliveryId: string;
}

interface WeatherAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  acknowledged: boolean;
}

interface TrafficCondition {
  id: string;
  condition_type: string;
  severity: string;
  description: string;
  affected_road: string;
  estimated_delay_minutes: number;
  resolved_at: string | null;
}

export const TrafficWeatherAlerts: React.FC<TrafficWeatherAlertsProps> = ({ deliveryId }) => {
  const { data: weatherAlerts, isLoading: loadingWeather } = useQuery({
    queryKey: ['weather-alerts', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weather_alerts')
        .select('*')
        .eq('delivery_id', deliveryId)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WeatherAlert[];
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: trafficConditions, isLoading: loadingTraffic } = useQuery({
    queryKey: ['traffic-conditions', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_conditions')
        .select('*')
        .eq('delivery_id', deliveryId)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TrafficCondition[];
    },
    refetchInterval: 180000, // Refetch every 3 minutes
  });

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'severe':
        return 'destructive';
      case 'high':
      case 'major':
        return 'default';
      case 'medium':
      case 'moderate':
        return 'secondary';
      case 'low':
      case 'minor':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const isLoading = loadingWeather || loadingTraffic;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Traffic & Weather Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAlerts = (weatherAlerts && weatherAlerts.length > 0) || (trafficConditions && trafficConditions.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Traffic & Weather Alerts
        </CardTitle>
        <CardDescription>
          Real-time conditions affecting your delivery route
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAlerts ? (
          <div className="text-center py-6 text-muted-foreground">
            All clear! No active alerts for this delivery.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Weather Alerts */}
            {weatherAlerts && weatherAlerts.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Weather Alerts
                </h4>
                {weatherAlerts.map((alert) => (
                  <Alert key={alert.id} className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{alert.title}</span>
                            <Badge variant={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.description}
                          </p>
                          {alert.start_time && alert.end_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(alert.start_time).toLocaleString()} - {new Date(alert.end_time).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Traffic Conditions */}
            {trafficConditions && trafficConditions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Traffic Conditions
                </h4>
                {trafficConditions.map((condition) => (
                  <Alert key={condition.id} className="border-red-200 bg-red-50">
                    <Navigation className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{condition.condition_type}</span>
                            <Badge variant={getSeverityColor(condition.severity)}>
                              {condition.severity}
                            </Badge>
                            {condition.estimated_delay_minutes > 0 && (
                              <Badge variant="outline">
                                +{condition.estimated_delay_minutes}min delay
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {condition.description}
                          </p>
                          {condition.affected_road && (
                            <p className="text-xs text-muted-foreground">
                              Affected road: {condition.affected_road}
                            </p>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};