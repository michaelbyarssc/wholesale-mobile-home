
import React from 'react';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';

interface MobileHomesDebugPanelProps {
  user?: User | null;
  debugInfo: string[];
  error?: Error | null;
  onRefetch: () => void;
}

export const MobileHomesDebugPanel = ({ 
  user, 
  debugInfo, 
  error, 
  onRefetch 
}: MobileHomesDebugPanelProps) => {
  if (!error) return null;

  return (
    <section className="py-20 bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Our Mobile Home Models
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
            <p className="text-red-600 font-medium mb-2">Unable to load mobile homes</p>
            <p className="text-red-500 text-sm mb-4">
              We're experiencing technical difficulties. Debug information:
            </p>
            <div className="space-y-2 mb-4 text-left">
              <p className="text-sm"><strong>User:</strong> {user?.email || 'Not logged in'}</p>
              <p className="text-sm"><strong>Database Connected:</strong> Yes</p>
              <p className="text-sm"><strong>Error:</strong> {error.message}</p>
              <div className="mt-4 max-h-60 overflow-y-auto bg-gray-100 p-3 rounded text-xs">
                <strong>Debug Log:</strong>
                {debugInfo.map((info, index) => (
                  <div key={index} className="py-1 border-b border-gray-200 last:border-b-0">
                    {info}
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={onRefetch} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
