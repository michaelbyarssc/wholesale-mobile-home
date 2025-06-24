
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface EstimateTotalProps {
  total: number;
  user: User | null;
}

export const EstimateTotal = ({ total, user }: EstimateTotalProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-blue-900">Total Estimate:</h3>
            <p className="text-sm text-gray-600">*Final pricing may vary based on site conditions</p>
          </div>
          <div className="text-4xl font-bold text-green-600">
            ${total.toLocaleString()}
          </div>
        </div>
        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
        >
          Get My Estimate
        </Button>
        {!user && (
          <p className="text-sm text-gray-600 mt-2 text-center">
            <Link to="/auth" className="text-blue-600 hover:underline">
              Sign in or create an account
            </Link> to save your estimates for future reference.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
