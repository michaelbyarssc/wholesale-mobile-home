
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AuthNavigationProps {
  isSignUp: boolean;
  isForgotPassword: boolean;
  onToggleAuthMode: () => void;
  onToggleForgotPassword: () => void;
  currentUser: any;
  isAdmin: boolean;
  onShowPasswordChange: () => void;
}

export const AuthNavigation: React.FC<AuthNavigationProps> = ({
  isSignUp,
  isForgotPassword,
  onToggleAuthMode,
  onToggleForgotPassword,
  currentUser,
  isAdmin,
  onShowPasswordChange,
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        {!isForgotPassword ? (
          <>
            <Button
              variant="link"
              onClick={onToggleAuthMode}
              className="text-blue-600"
            >
              {isSignUp 
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one"
              }
            </Button>
            {!isSignUp && (
              <div>
                <Button
                  variant="link"
                  onClick={onToggleForgotPassword}
                  className="text-blue-600 text-sm"
                >
                  Forgot your password?
                </Button>
              </div>
            )}
          </>
        ) : (
          <Button
            variant="link"
            onClick={onToggleForgotPassword}
            className="text-blue-600"
          >
            Back to Sign In
          </Button>
        )}
      </div>

      <div className="text-center">
        <Button
          variant="outline"
          onClick={() => navigate('/')}
          className="w-full"
        >
          Back to Home
        </Button>
      </div>

      {/* Show change password button if user is logged in */}
      {currentUser && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={onShowPasswordChange}
            className="w-full bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
          >
            Change Password
          </Button>
        </div>
      )}

      {/* Only show admin login button if user is admin */}
      {isAdmin && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="w-full bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          >
            Access Admin Dashboard
          </Button>
        </div>
      )}
    </div>
  );
};
