
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PriceMatchAlert = () => {
  return (
    <Alert className="bg-green-600 border-green-600 text-white rounded-none border-t-0 border-l-0 border-r-0 py-4">
      <AlertDescription className="text-center font-medium text-lg">
        The absolute best deal is always ensured with our verified price match guarantee!
      </AlertDescription>
    </Alert>
  );
};
