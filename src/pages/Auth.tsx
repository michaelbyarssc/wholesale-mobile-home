
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

    // EMERGENCY: Session validation with strict user checking
    const emergencySessionCheck = async () => {
      console.log('🚨 AUTH PAGE: Starting emergency session validation...');
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('🚨 AUTH PAGE: Error getting user:', error);
          setCheckingAdminStatus(false);
          return;
        }
        
        if (user) {
          console.log('🚨 AUTH PAGE: User found:', {
            id: user.id,
            email: user.email,
            timestamp: new Date().toISOString()
          });
          setCurrentUser(user);
          
          // EMERGENCY: Double-check session integrity
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && session.user.id !== user.id) {
            console.error('🚨 AUTH PAGE: CRITICAL SESSION MISMATCH!', {
              getUserId: user.id,
              getUserEmail: user.email,
              sessionUserId: session.user.id,
              sessionUserEmail: session.user.email
            });
            
            // Force complete logout and clear
            await supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/auth';
            return;
          }
          
          // Get user profile with validation
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', user.id)
            .single();

          if (profileError) {
            console.error('🚨 AUTH PAGE: Profile fetch error:', profileError);
          } else if (profileData) {
            console.log('🚨 AUTH PAGE: Profile loaded:', {
              firstName: profileData.first_name,
              lastName: profileData.last_name,
              userId: user.id
            });
            setUserProfile(profileData);
          }

          // CRITICAL: Only redirect if roles are fully loaded AND no session mismatch
          console.log('🚨 AUTH PAGE: Role check - rolesLoading:', rolesLoading, 'isAdmin:', isAdmin);
          if (!rolesLoading) {
            console.log('🚨 AUTH PAGE: Roles loaded, safe to redirect...');
            
            // Add small delay to prevent redirect loop
            setTimeout(() => {
              if (isAdmin) {
                console.log('🚨 AUTH PAGE: Redirecting admin to /admin');
                navigate('/admin');
              } else {
                console.log('🚨 AUTH PAGE: Redirecting regular user to /');
                navigate('/');
              }
            }, 100);
            return;
          } else {
            console.log('🚨 AUTH PAGE: Roles still loading, waiting...');
          }
        } else {
          console.log('🚨 AUTH PAGE: No user found - staying on auth page');
        }
        
        setCheckingAdminStatus(false);
      } catch (error) {
        console.error('🚨 AUTH PAGE: Emergency session check failed:', error);
        setCheckingAdminStatus(false);
      }
    };

    emergencySessionCheck();

    // EMERGENCY: Enhanced auth state listener with strict validation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🚨 AUTH PAGE: Auth state changed:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        rolesLoading,
        isAdmin,
        timestamp: new Date().toISOString()
      });
      
      // Prevent redirect loops by only redirecting on successful sign in
      if (event === 'SIGNED_IN' && session?.user && !rolesLoading) {
        console.log('🚨 AUTH PAGE: User authenticated and roles loaded, safe to redirect...');
        
        // Add delay to prevent redirect loop
        setTimeout(() => {
          if (isAdmin) {
            console.log('🚨 AUTH PAGE: Auth change - redirecting admin to /admin');
            navigate('/admin');
          } else {
            console.log('🚨 AUTH PAGE: Auth change - redirecting regular user to /');
            navigate('/');
          }
        }, 100);
      } else if (event === 'SIGNED_OUT') {
        console.log('🚨 AUTH PAGE: User signed out - staying on auth page');
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
