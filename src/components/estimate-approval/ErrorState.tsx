
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  approved: boolean;
}

export const ErrorState = ({ error, approved }: ErrorStateProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {approved ? 'Already Approved' : 'Error'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{error}</p>
          {approved && (
            <p className="text-sm text-gray-500">
              If you need assistance, please contact us directly.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
