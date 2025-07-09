import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

interface OfflineIndicatorProps {
  variant?: 'badge' | 'alert' | 'minimal';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ 
  variant = 'badge' 
}) => {
  const { isOffline } = usePWA();

  if (!isOffline) {
    return null;
  }

  if (variant === 'minimal') {
    return (
      <div className="flex items-center gap-2 text-orange-600">
        <WifiOff className="h-4 w-4" />
        <span className="text-sm font-medium">Offline</span>
      </div>
    );
  }

  if (variant === 'alert') {
    return (
      <Alert className="border-orange-200 bg-orange-50 mb-4">
        <WifiOff className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          You're currently offline. Some features may be limited, but you can still browse cached content.
        </AlertDescription>
      </Alert>
    );
  }

  // Default badge variant
  return (
    <Badge 
      variant="outline" 
      className="border-orange-200 bg-orange-50 text-orange-700 animate-pulse"
    >
      <WifiOff className="h-3 w-3 mr-1" />
      Offline Mode
    </Badge>
  );
};

export const OnlineIndicator: React.FC = () => {
  const { isOffline } = usePWA();

  if (isOffline) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="border-green-200 bg-green-50 text-green-700"
    >
      <Wifi className="h-3 w-3 mr-1" />
      Online
    </Badge>
  );
};