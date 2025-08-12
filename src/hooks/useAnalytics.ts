import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface AnalyticsSession {
  sessionId: string;
  userId?: string;
  userAgent: string;
  referrer: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType: string;
  browser: string;
  os: string;
  startedAt: Date;
}

interface PageViewData {
  pagePath: string;
  pageTitle: string;
  referrer: string;
  searchQuery?: string;
  filtersApplied?: Record<string, any>;
}

interface EventData {
  eventType: string;
  eventName: string;
  pagePath?: string;
  elementId?: string;
  elementText?: string;
  properties?: Record<string, any>;
  value?: number;
}

interface MobileHomeViewData {
  mobileHomeId: string;
  viewType: 'list' | 'detail' | 'gallery' | 'comparison';
  timeSpent?: number;
  imagesViewed?: number;
  featuresClicked?: string[];
  priceChecked?: boolean;
  contactClicked?: boolean;
}

interface SearchData {
  searchQuery?: string;
  filters?: Record<string, any>;
  resultsCount?: number;
  resultClicked?: boolean;
  clickedPosition?: number;
  clickedMobileHomeId?: string;
}

interface ConversionData {
  funnelStep: 'page_view' | 'mobile_home_view' | 'contact_click' | 'estimate_start' | 'estimate_submit' | 'appointment_book';
  mobileHomeId?: string;
  estimateId?: string;
  appointmentId?: string;
  value?: number;
  metadata?: Record<string, any>;
}

class AnalyticsTracker {
  private sessionId: string;
  private sessionDbId: string | null = null;
  private userId: string | null = null;
  private pageStartTime: number = Date.now();
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate a UUID v4 client-side to avoid SELECT after INSERT
  private generateUUID(): string {
    const w = typeof window !== 'undefined' ? window : undefined as any;
    if (w && w.crypto && typeof w.crypto.randomUUID === 'function') {
      return w.crypto.randomUUID();
    }
    // Fallback UUID generator
    const bytes = new Uint8Array(16);
    if (w && w.crypto && typeof w.crypto.getRandomValues === 'function') {
      w.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    // Per RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }

  private getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    // Detect device type
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      deviceType = /iPad/.test(userAgent) ? 'tablet' : 'mobile';
    }

    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
  }

  private getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      utmSource: urlParams.get('utm_source') || undefined,
      utmMedium: urlParams.get('utm_medium') || undefined,
      utmCampaign: urlParams.get('utm_campaign') || undefined,
    };
  }

  async initializeSession(userId?: string) {
    if (this.isInitialized) return;

    this.userId = userId || null;
    const { deviceType, browser, os } = this.getDeviceInfo();
    const utmParams = this.getUtmParams();

    try {
      // Pre-generate session UUID to avoid SELECT after INSERT
      this.sessionDbId = this.generateUUID();

      await supabase
        .from('analytics_sessions')
        .insert({
          id: this.sessionDbId as any, // explicit id to skip returning select
          session_id: this.sessionId,
          user_id: this.userId,
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          device_type: deviceType,
          browser,
          os,
          ...utmParams,
        } as any, { returning: 'minimal' });

      this.isInitialized = true;

      // Track initial page view
      this.trackPageView({
        pagePath: window.location.pathname,
        pageTitle: document.title,
        referrer: document.referrer,
      });

      // Set up beforeunload listener to update session end time
      window.addEventListener('beforeunload', this.endSession.bind(this));
    } catch (error) {
      console.error('Error initializing analytics:', error);
    }
  }

  async trackPageView(data: PageViewData) {
    if (!this.sessionDbId) return;

    // Update previous page time if exists
    const timeOnPreviousPage = Date.now() - this.pageStartTime;
    this.pageStartTime = Date.now();

    try {
      await supabase.from('analytics_page_views').insert({
        session_id: this.sessionDbId,
        user_id: this.userId,
        page_path: data.pagePath,
        page_title: data.pageTitle,
        referrer: data.referrer,
        search_query: data.searchQuery,
        filters_applied: data.filtersApplied || {},
      }, { returning: 'minimal' });

      // Track conversion funnel
      await this.trackConversion({
        funnelStep: 'page_view',
      });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  }

  async trackEvent(data: EventData) {
    if (!this.sessionDbId) return;

    try {
      await supabase.from('analytics_events').insert({
        session_id: this.sessionDbId,
        user_id: this.userId,
        event_type: data.eventType,
        event_name: data.eventName,
        page_path: data.pagePath || window.location.pathname,
        element_id: data.elementId,
        element_text: data.elementText,
        properties: data.properties || {},
        value: data.value,
      }, { returning: 'minimal' });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  async trackMobileHomeView(data: MobileHomeViewData) {
    if (!this.sessionDbId) return;

    try {
      await supabase.from('analytics_mobile_home_views').insert({
        session_id: this.sessionDbId,
        user_id: this.userId,
        mobile_home_id: data.mobileHomeId,
        view_type: data.viewType,
        time_spent: data.timeSpent || 0,
        images_viewed: data.imagesViewed || 0,
        features_clicked: data.featuresClicked || [],
        price_checked: data.priceChecked || false,
        contact_clicked: data.contactClicked || false,
      }, { returning: 'minimal' });

      // Track conversion funnel
      await this.trackConversion({
        funnelStep: 'mobile_home_view',
        mobileHomeId: data.mobileHomeId,
      });
    } catch (error) {
      console.error('Error tracking mobile home view:', error);
    }
  }

  async trackSearch(data: SearchData) {
    if (!this.sessionDbId) return;

    try {
      await supabase.from('analytics_searches').insert({
        session_id: this.sessionDbId,
        user_id: this.userId,
        search_query: data.searchQuery,
        filters: data.filters || {},
        results_count: data.resultsCount || 0,
        result_clicked: data.resultClicked || false,
        clicked_position: data.clickedPosition,
        clicked_mobile_home_id: data.clickedMobileHomeId,
      }, { returning: 'minimal' });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  async trackConversion(data: ConversionData) {
    if (!this.sessionDbId) return;

    try {
      await supabase.from('analytics_conversions').insert({
        session_id: this.sessionDbId,
        user_id: this.userId,
        funnel_step: data.funnelStep,
        mobile_home_id: data.mobileHomeId,
        estimate_id: data.estimateId,
        appointment_id: data.appointmentId,
        value: data.value,
        metadata: data.metadata || {},
      }, { returning: 'minimal' });
    } catch (error) {
      console.error('Error tracking conversion:', error);
    }
  }

  private async endSession() {
    if (!this.sessionDbId) return;

    const sessionDuration = Math.floor((Date.now() - this.pageStartTime) / 1000);

    try {
      await supabase
        .from('analytics_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: sessionDuration,
        }, { returning: 'minimal' })
        .eq('id', this.sessionDbId);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }
}

// Create global analytics instance
const analytics = new AnalyticsTracker();

export function useAnalytics() {
  const { user } = useAuthUser();
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      analytics.initializeSession(user?.id);
      initialized.current = true;
    }
  }, [user?.id]);

  const trackPageView = useCallback((data: Omit<PageViewData, 'pagePath' | 'pageTitle' | 'referrer'> & Partial<Pick<PageViewData, 'pagePath' | 'pageTitle' | 'referrer'>>) => {
    analytics.trackPageView({
      pagePath: window.location.pathname,
      pageTitle: document.title,
      referrer: document.referrer,
      ...data,
    });
  }, []);

  const trackEvent = useCallback((data: EventData) => {
    analytics.trackEvent(data);
  }, []);

  const trackMobileHomeView = useCallback((data: MobileHomeViewData) => {
    analytics.trackMobileHomeView(data);
  }, []);

  const trackSearch = useCallback((data: SearchData) => {
    analytics.trackSearch(data);
  }, []);

  const trackConversion = useCallback((data: ConversionData) => {
    analytics.trackConversion(data);
  }, []);

  const trackClick = useCallback((elementId: string, elementText?: string, properties?: Record<string, any>) => {
    trackEvent({
      eventType: 'interaction',
      eventName: 'click',
      elementId,
      elementText,
      properties,
    });
  }, [trackEvent]);

  const trackScroll = useCallback((scrollDepth: number) => {
    trackEvent({
      eventType: 'interaction',
      eventName: 'scroll',
      properties: { scrollDepth },
    });
  }, [trackEvent]);

  return {
    trackPageView,
    trackEvent,
    trackMobileHomeView,
    trackSearch,
    trackConversion,
    trackClick,
    trackScroll,
  };
}

export default analytics;
