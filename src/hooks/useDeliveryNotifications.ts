import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationResult {
  success: boolean;
  deliveryNumber?: string;
  trackingUrl?: string;
  notifications?: {
    email: boolean;
    sms: boolean;
  };
  error?: string;
}

export function useDeliveryNotifications() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<NotificationResult | null>(null);

  const sendNotifications = async (
    deliveryId: string, 
    type: 'email' | 'sms' | 'both' = 'both'
  ): Promise<NotificationResult> => {
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

      const result: NotificationResult = {
        success: data?.success || false,
        deliveryNumber: data?.deliveryNumber,
        trackingUrl: data?.trackingUrl,
        notifications: data?.notifications,
        error: data?.error
      };

      setLastResult(result);

      if (result.success) {
        const sentTypes = [];
        if (result.notifications?.email) sentTypes.push('email');
        if (result.notifications?.sms) sentTypes.push('SMS');
        
        if (sentTypes.length > 0) {
          toast.success(`Tracking notifications sent via ${sentTypes.join(' and ')}`);
        } else {
          toast.warning('No notifications were sent. Check customer contact information.');
        }
      } else {
        throw new Error(result.error || 'Failed to send notifications');
      }

      return result;
    } catch (error: any) {
      const errorResult: NotificationResult = {
        success: false,
        error: error.message || 'Failed to send notifications'
      };
      
      setLastResult(errorResult);
      toast.error(errorResult.error);
      
      return errorResult;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendNotifications,
    loading,
    lastResult
  };
}