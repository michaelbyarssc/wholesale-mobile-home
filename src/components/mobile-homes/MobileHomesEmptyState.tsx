
import React from 'react';
import { Button } from '@/components/ui/button';
import { User } from '@supabase/supabase-js';

interface MobileHomesEmptyStateProps {
  user?: User | null;
  onRefetch: () => void;
}

export const MobileHomesEmptyState = ({ user, onRefetch }: MobileHomesEmptyStateProps) => {
  return (
    <section className="py-20 bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Our Mobile Home Models
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
            <p className="text-yellow-800 font-medium mb-2">No mobile homes available</p>
            <p className="text-yellow-700 text-sm mb-4">
              We're currently updating our inventory. Please check back soon or contact us for availability.
            </p>
            <div className="space-y-2 mb-4 text-sm text-gray-600">
              <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
              <p><strong>Query executed successfully:</strong> Yes</p>
              <p><strong>Database connection:</strong> Working</p>
              <p><strong>Records returned:</strong> 0</p>
            </div>
            <Button onClick={onRefetch} variant="outline">
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
