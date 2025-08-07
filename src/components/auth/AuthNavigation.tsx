
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
  isAddUserMode?: boolean;
}

export const AuthNavigation: React.FC<AuthNavigationProps> = ({
  isSignUp,
  isForgotPassword,
  onToggleAuthMode,
  onToggleForgotPassword,
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
    </div>
  );
};
