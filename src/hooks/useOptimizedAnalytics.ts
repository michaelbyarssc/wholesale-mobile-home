import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Batch analytics events to reduce database load
let analyticsQueue: any[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

const BATCH_SIZE = 10;
const BATCH_DELAY = 2000; // 2 seconds

const processBatch = async () => {
  if (analyticsQueue.length === 0) return;
  
  const batch = analyticsQueue.splice(0, BATCH_SIZE);
  
  try {
    // Process different types of analytics
    const pageViews = batch.filter(item => item.type === 'page_view');
    const events = batch.filter(item => item.type === 'event');
    const mobileHomeViews = batch.filter(item => item.type === 'mobile_home_view');
    
    // Batch insert page views
    if (pageViews.length > 0) {
      await supabase
        .from('analytics_page_views')
        .insert(pageViews.map(pv => ({
          session_id: pv.session_id,
          user_id: pv.user_id,
          page_path: pv.path,
          referrer: pv.referrer,
          time_on_page: pv.time_spent
        })));
    }
    
    // Batch insert events
    if (events.length > 0) {
      await supabase
        .from('analytics_events')
        .insert(events.map(e => ({
          session_id: e.session_id,
          user_id: e.user_id,
          event_name: e.event_type,
          event_type: e.event_type,
          properties: e.event_data
        })));
    }
    
    // Batch insert mobile home views
    if (mobileHomeViews.length > 0) {
      await supabase
        .from('analytics_mobile_home_views')
        .insert(mobileHomeViews.map(mhv => ({
          session_id: mhv.session_id,
          user_id: mhv.user_id,
          mobile_home_id: mhv.mobile_home_id,
          time_spent: mhv.time_spent,
          view_type: mhv.view_source
        })));
    }
    
    console.log(`📊 Analytics: Processed batch of ${batch.length} events`);
  } catch (error) {
    console.error('📊 Analytics: Batch processing error:', error);
    // Re-queue failed items (limited retry)
    batch.forEach(item => {
      if (!item.retryCount || item.retryCount < 2) {
        analyticsQueue.push({ ...item, retryCount: (item.retryCount || 0) + 1 });
      }
    });
  }
  
  // Process remaining queue
  if (analyticsQueue.length > 0) {
    batchTimeout = setTimeout(processBatch, BATCH_DELAY);
  } else {
    batchTimeout = null;
  }
};

const queueAnalyticsEvent = (event: any) => {
  analyticsQueue.push(event);
  
  // Start batch processing if not already running
  if (!batchTimeout) {
    batchTimeout = setTimeout(processBatch, BATCH_DELAY);
  }
  
  // Force process if queue is full
  if (analyticsQueue.length >= BATCH_SIZE) {
    if (batchTimeout) {
      clearTimeout(batchTimeout);
    }
    processBatch();
  }
};

export const useOptimizedAnalytics = () => {
  const trackPageView = useCallback((path: string, referrer?: string, timeSpent?: number) => {
    queueAnalyticsEvent({
      type: 'page_view',
      session_id: sessionStorage.getItem('wmh_session_id') || 'anonymous',
      user_id: null, // Will be set by auth if available
      path,
      referrer,
      time_spent: timeSpent || 0
    });
  }, []);

  const trackEvent = useCallback((eventType: string, eventData?: any) => {
    queueAnalyticsEvent({
      type: 'event',
      session_id: sessionStorage.getItem('wmh_session_id') || 'anonymous',
      user_id: null,
      event_type: eventType,
      event_data: eventData || {}
    });
  }, []);

  const trackMobileHomeView = useCallback((mobileHomeId: string, viewSource: string = 'showcase', timeSpent?: number) => {
    queueAnalyticsEvent({
      type: 'mobile_home_view',
      session_id: sessionStorage.getItem('wmh_session_id') || 'anonymous',
      user_id: null,
      mobile_home_id: mobileHomeId,
      time_spent: timeSpent || 0,
      view_source: viewSource
    });
  }, []);

  return {
    trackPageView,
    trackEvent,
    trackMobileHomeView
  };
};