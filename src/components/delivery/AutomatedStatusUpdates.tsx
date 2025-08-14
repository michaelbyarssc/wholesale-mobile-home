import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Zap, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Settings,
  AlertCircle,
  Truck,
  Navigation,
  Bell
} from "lucide-react";

interface AutomatedStatusUpdatesProps {
  deliveryId: string;
  currentStatus: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: 'location' | 'time' | 'speed';
  trigger_condition: any;
  action_type: 'status_update' | 'notification' | 'both';
  enabled: boolean;
}

export const AutomatedStatusUpdates = ({ deliveryId, currentStatus }: AutomatedStatusUpdatesProps) => {
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const queryClient = useQueryClient();

  // Mock automation rules (since tables don't exist yet)
  const automationRules = [
    {
      id: '1',
      name: 'Factory Pickup Detection',
      trigger_type: 'location',
      trigger_condition: { type: 'geofence_enter' },
      action_type: 'status_update',
      enabled: true
    },
    {
      id: '2', 
      name: 'In Transit Update',
      trigger_type: 'location',
      trigger_condition: { type: 'geofence_exit' },
      action_type: 'both',
      enabled: true
    }
  ];

  // Mock automation logs
  const automationLogs = [
    {
      id: '1',
      rule_name: 'Factory Pickup Detection',
      action_taken: 'Updated status to factory_pickup_in_progress',
      success: true,
      created_at: new Date().toISOString()
    }
  ];

  // Toggle automation (mock implementation for now)
  const toggleAutomationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      // This would update the delivery automation settings
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      toast.success('Automation settings updated');
      // In real implementation: queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    }
  });

  // Setup default automation rules (mock implementation)
  const setupDefaultRulesMutation = useMutation({
    mutationFn: async () => {
      // This would create automation rules in the database
      // For now, just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast.success('Default automation rules would be created');
      // In real implementation: queryClient.invalidateQueries({ queryKey: ['automation-rules', deliveryId] });
    }
  });

  // Listen for GPS updates to trigger automation
  useEffect(() => {
    if (!automationEnabled || !deliveryId) return;

    const channel = supabase
      .channel('delivery-automation')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_gps_tracking',
          filter: `delivery_id=eq.${deliveryId}`
        },
        async (payload) => {
          console.log('GPS update for automation:', payload);
          
          // Process automation rules
          try {
            await supabase.functions.invoke('process-delivery-automation', {
              body: {
                delivery_id: deliveryId,
                gps_data: payload.new
              }
            });
          } catch (error) {
            console.error('Error processing automation:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deliveryId, automationEnabled]);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'status_update': return <Truck className="h-4 w-4" />;
      case 'notification': return <Bell className="h-4 w-4" />;
      case 'both': return <Zap className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'location': return <MapPin className="h-4 w-4" />;
      case 'time': return <Clock className="h-4 w-4" />;
      case 'speed': return <Navigation className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Automation Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automated Status Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="automation-enabled" className="text-sm font-medium">
                Enable Automation
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically update delivery status based on GPS location and other triggers
              </p>
            </div>
            <Switch
              id="automation-enabled"
              checked={automationEnabled}
              onCheckedChange={(checked) => {
                setAutomationEnabled(checked);
                toggleAutomationMutation.mutate(checked);
              }}
            />
          </div>

          {!automationRules?.length && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">No automation rules found</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Set up default automation rules to automatically update delivery status and notify customers.
              </p>
              <Button
                size="sm"
                onClick={() => setupDefaultRulesMutation.mutate()}
                disabled={setupDefaultRulesMutation.isPending}
              >
                <Settings className="h-4 w-4 mr-2" />
                Setup Default Rules
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Rules */}
      {automationRules?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Automation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {automationRules.map((rule: any) => (
                <div
                  key={rule.id}
                  className={`border rounded-lg p-3 ${
                    rule.enabled ? 'bg-muted/20' : 'bg-muted/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTriggerIcon(rule.trigger_type)}
                      <span className="text-sm font-medium">{rule.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getActionIcon(rule.action_type)}
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <span className="capitalize">{rule.trigger_type}</span> trigger • 
                    <span className="capitalize ml-1">{rule.action_type.replace('_', ' ')}</span>
                    {rule.new_status && (
                      <span className="ml-1">→ {rule.new_status.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation Logs */}
      {automationLogs?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Automation Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {automationLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-2 border rounded text-sm"
                >
                  <div className="flex-shrink-0">
                    {log.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <span className="font-medium">{log.rule_name}</span>
                    {log.action_taken && (
                      <span className="text-muted-foreground ml-2">
                        • {log.action_taken}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};