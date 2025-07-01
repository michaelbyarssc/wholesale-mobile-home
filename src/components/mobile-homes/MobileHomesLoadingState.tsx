
import React from 'react';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';

interface MobileHomesLoadingStateProps {
  user?: User | null;
  debugInfo: string[];
  onRefetch: () => void;
}

export const MobileHomesLoadingState = ({ 
  user, 
  debugInfo, 
  onRefetch 
}: MobileHomesLoadingStateProps) => {
  return (
    <section className="py-20 bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Our Mobile Home Models
          </h3>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg">Loading our amazing mobile home models...</span>
          </div>
          <p className="text-gray-600 mb-4">This should only take a moment</p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-4xl mx-auto mb-4">
            <div className="text-sm text-left space-y-1">
              <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
              <p><strong>Database Connected:</strong> Yes</p>
              <p><strong>Query Status:</strong> Loading...</p>
            </div>
            
            {debugInfo.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto bg-white p-3 rounded text-xs">
                <strong>Real-time Debug Log:</strong>
                {debugInfo.map((info, index) => (
                  <div key={index} className="py-1 border-b border-gray-200 last:border-b-0">
                    {info}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <Button onClick={onRefetch} variant="outline" className="mt-2">
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
};
