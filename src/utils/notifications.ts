import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: 'estimate' | 'inventory' | 'price' | 'system';
  data?: Record<string, any>;
  expiresHours?: number;
}

export async function sendNotification(notificationData: NotificationData) {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: notificationData
    });

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Helper functions for common notification types
export async function sendEstimateNotification(
  userId: string, 
  estimateId: string, 
  status: string,
  customerName: string
) {
  const titles = {
    created: 'New Estimate Created',
    approved: 'Estimate Approved',
    rejected: 'Estimate Rejected',
    updated: 'Estimate Updated'
  };

  const messages = {
    created: `A new estimate has been created for ${customerName}`,
    approved: `Estimate for ${customerName} has been approved`,
    rejected: `Estimate for ${customerName} has been rejected`,
    updated: `Estimate for ${customerName} has been updated`
  };

  return sendNotification({
    userId,
    title: titles[status as keyof typeof titles] || 'Estimate Update',
    message: messages[status as keyof typeof messages] || `Estimate status: ${status}`,
    type: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
    category: 'estimate',
    data: { estimateId, customerName, status }
  });
}

export async function sendInventoryNotification(
  userIds: string[],
  homeModel: string,
  action: 'added' | 'updated' | 'price_changed'
) {
  const notifications = userIds.map(userId => {
    const titles = {
      added: 'New Home Available',
      updated: 'Home Updated',
      price_changed: 'Price Update'
    };

    const messages = {
      added: `${homeModel} is now available in our inventory`,
      updated: `${homeModel} details have been updated`,
      price_changed: `Price updated for ${homeModel}`
    };

    return sendNotification({
      userId,
      title: titles[action],
      message: messages[action],
      type: action === 'price_changed' ? 'warning' : 'info',
      category: action === 'price_changed' ? 'price' : 'inventory',
      data: { homeModel, action }
    });
  });

  return Promise.all(notifications);
}

export async function sendSystemNotification(
  userIds: string[],
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  const notifications = userIds.map(userId =>
    sendNotification({
      userId,
      title,
      message,
      type,
      category: 'system'
    })
  );

  return Promise.all(notifications);
}