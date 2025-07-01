
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const PriceMatchAlert = () => {
  return (
    <Alert className="bg-green-100 border-green-300 text-green-800 rounded-none border-t-0 border-l-0 border-r-0">
      <AlertDescription className="text-center font-medium">
        The absolute best deal is always ensured with our verified price match guarantee!
      </AlertDescription>
    </Alert>
  );
};
