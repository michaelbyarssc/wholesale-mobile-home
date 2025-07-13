import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSenderProps {
  deliveryId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  deliveryNumber?: string;
}

export function NotificationSender({
  deliveryId,
  customerName,
  customerEmail,
  customerPhone,
  deliveryNumber
}: NotificationSenderProps) {
  const [loading, setLoading] = useState(false);
  const [lastSent, setLastSent] = useState<{
    email: boolean;
    sms: boolean;
    timestamp: Date;
  } | null>(null);

  const sendNotifications = async (type: 'email' | 'sms' | 'both') => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-delivery-tracking', {
        body: {
          deliveryId,
          notificationType: type
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setLastSent({
          email: data.notifications?.email || false,
          sms: data.notifications?.sms || false,
          timestamp: new Date()
        });

        const sentTypes = [];
        if (data.notifications?.email) sentTypes.push('email');
        if (data.notifications?.sms) sentTypes.push('SMS');
        
        toast.success(`Tracking notifications sent via ${sentTypes.join(' and ')}`);
      } else {
        throw new Error(data?.error || 'Failed to send notifications');
      }
    } catch (error: any) {
      console.error('Notification error:', error);
      toast.error(error.message || 'Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Send Tracking Notifications
        </CardTitle>
        <CardDescription>
          Send delivery tracking links to the customer via email and/or SMS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Customer:</span>
            <span className="text-sm">{customerName || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email:</span>
            <span className="text-sm">{customerEmail || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Phone:</span>
            <span className="text-sm">{customerPhone || 'N/A'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Delivery #:</span>
            <span className="text-sm">{deliveryNumber || 'N/A'}</span>
          </div>
        </div>

        {lastSent && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium mb-1">Last Sent: {lastSent.timestamp.toLocaleString()}</div>
            <div className="flex gap-2">
              {lastSent.email && <Badge variant="secondary">Email Sent</Badge>}
              {lastSent.sms && <Badge variant="secondary">SMS Sent</Badge>}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => sendNotifications('email')}
            disabled={loading || !customerEmail}
            variant="outline"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Send Email
          </Button>
          
          <Button
            onClick={() => sendNotifications('sms')}
            disabled={loading || !customerPhone}
            variant="outline"
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MessageSquare className="h-4 w-4 mr-2" />
            )}
            Send SMS
          </Button>
          
          <Button
            onClick={() => sendNotifications('both')}
            disabled={loading || (!customerEmail && !customerPhone)}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Both
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Customers will receive a tracking link they can use to monitor their delivery status in real-time.
        </div>
      </CardContent>
    </Card>
  );
}