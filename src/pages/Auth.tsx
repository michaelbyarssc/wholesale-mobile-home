import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { AuthForm } from '@/components/auth/AuthForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthNavigation } from '@/components/auth/AuthNavigation';
import { UserWelcome } from '@/components/auth/UserWelcome';
import { EmergencyAuthForm } from '@/components/auth/EmergencyAuthForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Multi-user authentication
  const { user, userProfile, sessions, hasMultipleSessions } = useAuth();
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  
  // Check if this is "add user" mode
  const isAddUserMode = searchParams.get('mode') === 'add';

  useEffect(() => {
    console.log('🔐 AUTH PAGE: Multi-user auth check');
    
    // Check if this is a password reset flow
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setShowPasswordChange(true);
      return;
    }

    // Check if this is a forgot password flow
    const forgot = searchParams.get('forgot');
    if (forgot === 'true') {
      setIsForgotPassword(true);
    }

    // Skip redirect check in add user mode
    if (isAddUserMode) {
      console.log('🔐 AUTH PAGE: Add user mode, skipping redirect');
      return;
    }
    
    // If user is already logged in and not in add user mode, redirect
    if (user && !rolesLoading) {
      console.log('🔐 AUTH PAGE: User already logged in, redirecting...');
      
      setTimeout(() => {
        if (isAdmin) {
          console.log('🔐 AUTH PAGE: Redirecting admin to /admin');
          navigate('/admin');
        } else {
          console.log('🔐 AUTH PAGE: Redirecting user to /');
          navigate('/');
        }
      }, 100);
    }
  }, [user, isAdmin, rolesLoading, searchParams, navigate, isAddUserMode]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setIsForgotPassword(false);
    resetForm();
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setIsSignUp(false);
    setIsEmergencyMode(false);
    resetForm();
  };

  const toggleEmergencyMode = () => {
    setIsEmergencyMode(!isEmergencyMode);
    setIsForgotPassword(false);
    setIsSignUp(false);
    resetForm();
  };

  const handleBackToSessions = () => {
    navigate('/');
  };

  if (rolesLoading && !isAddUserMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button for add user mode */}
        {isAddUserMode && hasMultipleSessions && (
          <div className="mb-4">
            <Button
              onClick={handleBackToSessions}
              variant="ghost"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sessions
            </Button>
          </div>
        )}
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            WholesaleMobileHome.com
          </h1>
          {!isAddUserMode && userProfile && <UserWelcome userProfile={userProfile} />}
          {isAddUserMode && hasMultipleSessions && (
            <p className="text-gray-600">Add another user to this browser session</p>
          )}
          {isEmergencyMode && (
            <div className="flex items-center justify-center gap-2 text-orange-700 bg-orange-100 p-3 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">Emergency Authentication Mode</span>
            </div>
          )}
        </div>

        {/* Auth form */}
        {isEmergencyMode ? (
          <EmergencyAuthForm onBack={toggleEmergencyMode} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {isForgotPassword 
                  ? 'Reset Password' 
                  : isAddUserMode 
                    ? 'Add Another User'
                    : (isSignUp ? 'Create Account' : 'Sign In')
                }
              </CardTitle>
              <CardDescription>
                {isForgotPassword 
                  ? 'Enter your email to receive reset instructions'
                  : isAddUserMode
                    ? 'Sign in or create an account for another user'
                    : (isSignUp 
                      ? 'Create an account to access the platform'
                      : 'Sign in to access the platform'
                    )
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isForgotPassword ? (
                <ForgotPasswordForm
                  email={email}
                  setEmail={setEmail}
                  loading={loading}
                  setLoading={setLoading}
                  onBack={toggleForgotPassword}
                  resetForm={resetForm}
                />
              ) : (
                <AuthForm
                  isSignUp={isSignUp}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  firstName={firstName}
                  setFirstName={setFirstName}
                  lastName={lastName}
                  setLastName={setLastName}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  loading={loading}
                  setLoading={setLoading}
                  isAddUserMode={isAddUserMode}
                />
              )}
              
              <AuthNavigation
                isSignUp={isSignUp}
                isForgotPassword={isForgotPassword}
                onToggleAuthMode={toggleAuthMode}
                onToggleForgotPassword={toggleForgotPassword}
                currentUser={user}
                isAdmin={isAdmin}
                onShowPasswordChange={() => setShowPasswordChange(true)}
                isAddUserMode={isAddUserMode}
              />
            </CardContent>
          </Card>
        )}

        <PasswordChangeDialog
          isOpen={showPasswordChange}
          onClose={() => setShowPasswordChange(false)}
        />
      </div>
    </div>
  );
};

export default Auth;
