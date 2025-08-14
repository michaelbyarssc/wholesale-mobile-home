import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, 
  Phone, 
  Mail, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Calendar
} from "lucide-react";

interface NotificationProps {
  deliveryId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export const EnhancedCustomerNotifications = ({ 
  deliveryId, 
  customerName, 
  customerEmail, 
  customerPhone 
}: NotificationProps) => {
  const [message, setMessage] = useState('');
  const [includeETA, setIncludeETA] = useState(true);
  const [scheduledTime, setScheduledTime] = useState('');
  const queryClient = useQueryClient();

  // Get delivery status and ETA
  const { data: deliveryData } = useQuery({
    queryKey: ['delivery-status', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          delivery_gps_tracking (
            latitude,
            longitude,
            timestamp
          )
        `)
        .eq('id', deliveryId)
        .order('delivery_gps_tracking(timestamp)', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    }
  });

  // Calculate ETA based on current GPS location
  const calculateETA = async () => {
    if (!deliveryData?.delivery_gps_tracking?.[0]) return null;
    
    const currentLocation = deliveryData.delivery_gps_tracking[0];
    
    try {
      const { data, error } = await supabase.functions.invoke('calculate-shipping-distance', {
        body: {
          origin: `${currentLocation.latitude},${currentLocation.longitude}`,
          destination: deliveryData.delivery_address,
          delivery_id: deliveryId
        }
      });

      if (error) throw error;
      return data?.eta;
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    }
  };

  // Send SMS notification
  const sendSMSMutation = useMutation({
    mutationFn: async ({ phoneNumber, messageText }: { phoneNumber: string; messageText: string }) => {
      const { data, error } = await supabase.functions.invoke('send-sms-notification', {
        body: {
          to: phoneNumber,
          message: messageText,
          delivery_id: deliveryId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('SMS sent successfully');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['notification-history', deliveryId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to send SMS: ${error.message}`);
    }
  });

  // Send email notification
  const sendEmailMutation = useMutation({
    mutationFn: async ({ email, subject, messageText }: { email: string; subject: string; messageText: string }) => {
      const { data, error } = await supabase.functions.invoke('send-email-notification', {
        body: {
          to: email,
          subject,
          message: messageText,
          delivery_id: deliveryId,
          customer_name: customerName
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Email sent successfully');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['notification-history', deliveryId] });
    },
    onError: (error: any) => {
      toast.error(`Failed to send email: ${error.message}`);
    }
  });

  // Schedule notification
  const scheduleNotificationMutation = useMutation({
    mutationFn: async ({ type, scheduledFor }: { type: 'sms' | 'email'; scheduledFor: string }) => {
      const { data, error } = await supabase
        .from('notification_logs')
        .insert({
          delivery_id: deliveryId,
          notification_type: type,
          status: 'scheduled',
          scheduled_for: scheduledFor,
          message: message,
          customer_email: type === 'email' ? customerEmail : null,
          customer_phone: type === 'sms' ? customerPhone : null
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Notification scheduled successfully');
      setMessage('');
      setScheduledTime('');
      queryClient.invalidateQueries({ queryKey: ['notification-history', deliveryId] });
    }
  });

  // Get notification history
  const { data: notificationHistory } = useQuery({
    queryKey: ['notification-history', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: false });

      if (error && error.code !== 'PGRST116') {
        return []; // Return empty array if table doesn't exist
      }
      return data || [];
    }
  });

  const handleSendSMS = async () => {
    if (!customerPhone || !message.trim()) {
      toast.error('Phone number and message are required');
      return;
    }

    let finalMessage = message;
    
    if (includeETA) {
      const eta = await calculateETA();
      if (eta) {
        finalMessage += `\n\nEstimated arrival: ${new Date(eta).toLocaleTimeString()}`;
      }
    }

    sendSMSMutation.mutate({
      phoneNumber: customerPhone,
      messageText: finalMessage
    });
  };

  const handleSendEmail = async () => {
    if (!customerEmail || !message.trim()) {
      toast.error('Email address and message are required');
      return;
    }

    let finalMessage = message;
    
    if (includeETA) {
      const eta = await calculateETA();
      if (eta) {
        finalMessage += `\n\nEstimated arrival: ${new Date(eta).toLocaleString()}`;
      }
    }

    sendEmailMutation.mutate({
      email: customerEmail,
      subject: `Delivery Update - ${deliveryData?.delivery_number || deliveryId}`,
      messageText: finalMessage
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-500';
      case 'scheduled': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPresetMessages = () => [
    {
      title: "Pickup Confirmation",
      message: `Hi ${customerName}! Your mobile home has been picked up from the factory and is now on its way to you. We'll keep you updated on our progress.`
    },
    {
      title: "In Transit Update",
      message: `Hi ${customerName}! Your delivery is currently in transit. Our driver is making good progress and will arrive as scheduled.`
    },
    {
      title: "Arrival Soon",
      message: `Hi ${customerName}! We're about 30 minutes away from your delivery location. Please ensure someone is available to receive the delivery.`
    },
    {
      title: "Delivery Complete",
      message: `Hi ${customerName}! Your mobile home has been successfully delivered. Thank you for choosing us! Please let us know if you need any assistance.`
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Send Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Customer Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Messages */}
          <div>
            <Label className="text-sm font-medium">Quick Messages</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {getPresetMessages().map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage(preset.message)}
                  className="text-left justify-start h-auto p-3"
                >
                  <div>
                    <div className="font-medium text-sm">{preset.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {preset.message.substring(0, 60)}...
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <Label htmlFor="message">Custom Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Options */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-eta"
                checked={includeETA}
                onCheckedChange={setIncludeETA}
              />
              <Label htmlFor="include-eta" className="text-sm">
                Include ETA
              </Label>
            </div>
          </div>

          {/* Send Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSendSMS}
              disabled={!customerPhone || !message.trim() || sendSMSMutation.isPending}
              className="flex-1"
            >
              <Phone className="h-4 w-4 mr-2" />
              {sendSMSMutation.isPending ? 'Sending...' : 'Send SMS'}
            </Button>
            
            <Button
              onClick={handleSendEmail}
              disabled={!customerEmail || !message.trim() || sendEmailMutation.isPending}
              variant="outline"
              className="flex-1"
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>

          {/* Schedule for Later */}
          <div className="border-t pt-4">
            <Label htmlFor="scheduled-time">Schedule for Later</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="scheduled-time"
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!scheduledTime || !message.trim()}
                onClick={() => scheduleNotificationMutation.mutate({ 
                  type: 'sms', 
                  scheduledFor: scheduledTime 
                })}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Schedule
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notificationHistory?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No notifications sent yet
            </p>
          ) : (
            <div className="space-y-3">
              {notificationHistory?.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="flex-shrink-0 mt-1">
                    {notification.notification_type === 'sms' ? (
                      <Phone className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Mail className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {notification.notification_type.toUpperCase()}
                      </span>
                      <Badge 
                        variant="secondary"
                        className={`text-xs ${getStatusColor(notification.status)}`}
                      >
                        {notification.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {notification.content || 'No message content'}
                    </p>
                    
                    {notification.sent_at && (
                      <p className="text-xs text-blue-600 mt-1">
                        Sent at: {new Date(notification.sent_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {notification.status === 'sent' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : notification.status === 'failed' ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};