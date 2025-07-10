import React from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsWrapperProps {
  children: React.ReactNode;
  eventType?: string;
  eventName?: string;
  elementId?: string;
  properties?: Record<string, any>;
  trackOnMount?: boolean;
  trackOnClick?: boolean;
  trackOnHover?: boolean;
}

export const AnalyticsWrapper: React.FC<AnalyticsWrapperProps> = ({
  children,
  eventType = 'interaction',
  eventName,
  elementId,
  properties,
  trackOnMount = false,
  trackOnClick = true,
  trackOnHover = false,
}) => {
  const { trackEvent } = useAnalytics();

  React.useEffect(() => {
    if (trackOnMount && eventName) {
      trackEvent({
        eventType,
        eventName,
        elementId,
        properties,
      });
    }
  }, [trackOnMount, eventType, eventName, elementId, properties, trackEvent]);

  const handleClick = (e: React.MouseEvent) => {
    if (trackOnClick && eventName) {
      const element = e.currentTarget as HTMLElement;
      trackEvent({
        eventType,
        eventName,
        elementId: elementId || element.id,
        elementText: element.textContent || undefined,
        properties,
      });
    }
  };

  const handleMouseEnter = () => {
    if (trackOnHover && eventName) {
      trackEvent({
        eventType,
        eventName: `${eventName}_hover`,
        elementId,
        properties,
      });
    }
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      data-analytics-id={elementId}
    >
      {children}
    </div>
  );
};