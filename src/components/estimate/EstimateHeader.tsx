
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth';
import { User } from '@supabase/supabase-js';

interface EstimateHeaderProps {
  user: User | null;
  displayName: string | null;
  customerMarkup: number;
}

export const EstimateHeader = ({ user, displayName, customerMarkup }: EstimateHeaderProps) => {
  const navigate = useNavigate();
  const { handleLogout } = useCompatibleAuth();
  
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl font-bold text-blue-900 mb-2">
        Wholesale Mobile Home
      </h1>
      <p className="text-lg text-green-700">Browse Our Mobile Home Selection</p>
      <div className="mt-4 flex justify-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <p className="text-blue-600">Welcome, {displayName || user.email}</p>
            <Link to="/my-estimates">
              <Button variant="outline">
                My Estimates
              </Button>
            </Link>
            <Button 
              onClick={handleLogout} 
              variant="outline"
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="flex gap-4">
            <Link to="/auth">
              <Button variant="outline">
                Sign In / Sign Up
              </Button>
            </Link>
          </div>
        )}
        <Button 
          onClick={() => navigate('/admin')} 
          variant="outline"
        >
          Admin Login
        </Button>
      </div>
    </div>
  );
};
