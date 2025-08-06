
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { AuthForm } from '@/components/auth/AuthForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { AuthNavigation } from '@/components/auth/AuthNavigation';
import { UserWelcome } from '@/components/auth/UserWelcome';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAdmin, isLoading: rolesLoading } = useUserRoles();
  const [checkingAdminStatus, setCheckingAdminStatus] = useState(true);
  const [userProfile, setUserProfile] = useState<{first_name: string, last_name: string} | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🚨 AUTH PAGE: Emergency session isolation check - rolesLoading:', rolesLoading, 'isAdmin:', isAdmin);
    
    // Check if this is a password reset flow
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setShowPasswordChange(true);
      setCheckingAdminStatus(false);
      return;
    }

    // Check if this is a forgot password flow
    const forgot = searchParams.get('forgot');
    if (forgot === 'true') {
      setIsForgotPassword(true);
    }

    // Driver context for better UX
    const driver = searchParams.get('driver');
    if (driver === 'true') {
      console.log('Driver context detected for password reset');
    }

    // Simplified session check
    const checkCurrentUser = async () => {
      console.log('🔐 AUTH PAGE: Checking current user...');
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('AUTH PAGE: Error getting user:', error);
          setCheckingAdminStatus(false);
          return;
        }
        
        if (user) {
          console.log('🔐 AUTH PAGE: User found:', {
            id: user.id,
            email: user.email
          });
          setCurrentUser(user);
          
          // Get user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', user.id)
            .single();

          if (profileData) {
            console.log('🔐 AUTH PAGE: Profile loaded:', profileData);
            setUserProfile(profileData);
          }

          // Only redirect after roles are loaded
          if (!rolesLoading) {
            console.log('🔐 AUTH PAGE: Roles loaded, redirecting...');
            
            setTimeout(() => {
              if (isAdmin) {
                console.log('🔐 AUTH PAGE: Redirecting admin to /admin');
                navigate('/admin');
              } else {
                console.log('🔐 AUTH PAGE: Redirecting user to /');
                navigate('/');
              }
            }, 100);
            return;
          }
        } else {
          console.log('🔐 AUTH PAGE: No user found');
        }
        
        setCheckingAdminStatus(false);
      } catch (error) {
        console.error('AUTH PAGE: Check failed:', error);
        setCheckingAdminStatus(false);
      }
    };

    checkCurrentUser();

    // Simplified auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 AUTH PAGE: Auth state changed:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      });
      
      // Only redirect on successful sign in
      if (event === 'SIGNED_IN' && session?.user && !rolesLoading) {
        console.log('🔐 AUTH PAGE: User authenticated, redirecting...');
        
        // Small delay to prevent redirect race conditions
        setTimeout(() => {
          if (isAdmin) {
            console.log('🔐 AUTH PAGE: Redirecting admin to /admin');
            navigate('/admin');
          } else {
            console.log('🔐 AUTH PAGE: Redirecting user to /');
            navigate('/');
          }
        }, 200);
      } else if (event === 'SIGNED_OUT') {
        console.log('🔐 AUTH PAGE: User signed out');
        setCurrentUser(null);
        setUserProfile(null);
        setCheckingAdminStatus(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams, isAdmin, rolesLoading]);

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

  if (checkingAdminStatus) {
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">
            WholesaleMobileHome.com
          </h1>
          <UserWelcome userProfile={userProfile} />
        </div>

        {/* Auth form */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Sign In')}
            </CardTitle>
            <CardDescription>
              {isForgotPassword 
                ? 'Enter your email to receive reset instructions'
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
              />
            )}
            
            <AuthNavigation
              isSignUp={isSignUp}
              isForgotPassword={isForgotPassword}
              onToggleAuthMode={toggleAuthMode}
              onToggleForgotPassword={toggleForgotPassword}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onShowPasswordChange={() => setShowPasswordChange(true)}
            />
          </CardContent>
        </Card>

        <PasswordChangeDialog
          isOpen={showPasswordChange}
          onClose={() => setShowPasswordChange(false)}
        />
      </div>
    </div>
  );
};

export default Auth;
