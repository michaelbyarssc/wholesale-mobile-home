
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { AuthForm } from '@/components/auth/AuthForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthNavigation } from '@/components/auth/AuthNavigation';
import { UserWelcome } from '@/components/auth/UserWelcome';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SessionClearButton } from '@/components/admin/SessionClearButton';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Multi-user authentication - single source of truth
  const { user, userProfile, sessions, hasMultipleSessions, isLoading: authLoading } = useMultiUserAuth();
  
  // Only check roles if we have a user and auth is not loading
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
    
    // Only redirect if we have a valid authenticated user AND all checks are complete
    // This prevents premature redirects from corrupted sessions
    if (user && !authLoading && !rolesLoading) {
      console.log('🔐 AUTH PAGE: User detected, validating session before redirect...');
      
      // Add a small delay to ensure session validation is complete
      // and prevent race conditions with session cleanup
      setTimeout(async () => {
        try {
          // Double-check that the user session is still valid
          const { data: { user: currentUser }, error } = await supabase.auth.getUser();
          
          if (currentUser && !error) {
            console.log('🔐 AUTH PAGE: Session validated, redirecting authenticated user');
            if (isAdmin) {
              console.log('🔐 AUTH PAGE: Redirecting admin to /admin');
              navigate('/admin');
            } else {
              console.log('🔐 AUTH PAGE: Redirecting user to /');
              navigate('/');
            }
          } else {
            console.log('🔐 AUTH PAGE: Session invalid, clearing corrupted data');
            // Clear corrupted session data if validation fails
            localStorage.removeItem('wmh_sessions');
            localStorage.removeItem('wmh_active_session');
          }
        } catch (error) {
          console.error('🔐 AUTH PAGE: Session validation failed:', error);
          // Clear potentially corrupted session data
          localStorage.removeItem('wmh_sessions');
          localStorage.removeItem('wmh_active_session');
        }
      }, 300); // Increased delay to ensure proper validation
    }
  }, [user, isAdmin, authLoading, rolesLoading, searchParams, navigate, isAddUserMode]);

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
    resetForm();
  };

  const handleBackToSessions = () => {
    navigate('/');
  };

  if ((authLoading || rolesLoading) && !isAddUserMode) {
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
        </div>

        {/* Auth form */}
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

        <PasswordChangeDialog
          isOpen={showPasswordChange}
          onClose={() => setShowPasswordChange(false)}
        />
        
        {/* Development and testing utilities */}
        {(process.env.NODE_ENV === 'development' || !user) && (
          <div className="mt-4 text-center">
            <SessionClearButton />
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
