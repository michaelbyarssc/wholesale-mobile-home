
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AuthFormProps {
  isSignUp: boolean;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  firstName: string;
  setFirstName: (firstName: string) => void;
  lastName: string;
  setLastName: (lastName: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export const AuthForm = ({
  isSignUp,
  email,
  setEmail,
  password,
  setPassword,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phoneNumber,
  setPhoneNumber,
  loading,
  setLoading,
}: AuthFormProps) => {
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        console.error('Google sign in error:', error);
        toast({
          title: "Google Sign In Failed",
          description: error.message || "Failed to sign in with Google",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      toast({
        title: "Google Sign In Failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Starting sign up process...');
        
        // Check if user already exists and is approved
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('approved, user_id')
          .eq('email', email)
          .single();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error('Error checking existing profile:', profileCheckError);
        }

        // If user already exists and is approved, they should sign in instead
        if (existingProfile && existingProfile.approved) {
          toast({
            title: "Account Already Exists",
            description: "Your account is already approved. Please sign in instead.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // If user already exists but not approved, they're still pending
        if (existingProfile && !existingProfile.approved) {
          toast({
            title: "Account Pending",
            description: "Your account is already pending approval. Please wait for admin approval.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Proceed with normal signup process
        console.log('Proceeding with signup...');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
            },
          },
        });

        if (error) {
          console.error('Sign up error:', error);
          throw error;
        }

        console.log('Sign up successful:', data);

        // Send notification to admin about new user registration
        try {
          const { error: notificationError } = await supabase.functions.invoke('send-new-user-notification', {
            body: {
              firstName,
              lastName,
              email,
              phoneNumber,
            },
          });

          if (notificationError) {
            console.error('Notification error:', notificationError);
            // Don't throw here as the signup was successful
          }
        } catch (notificationError) {
          console.error('Failed to send admin notification:', notificationError);
          // Continue with success message even if notification fails
        }

        toast({
          title: "Account Created Successfully",
          description: "Your account has been created and is pending admin approval. You will receive an email once approved.",
        });
      } else {
        // Sign in process
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check if user is approved
        if (data.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('approved')
            .eq('user_id', data.user.id)
            .single();

          if (profileError) {
            console.error('Error checking approval status:', profileError);
          } else if (profileData && !profileData.approved) {
            // Sign out the user immediately
            await supabase.auth.signOut();
            toast({
              title: "Account Pending Approval",
              description: "Your account is still pending admin approval. Please wait for approval before signing in.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: isSignUp ? "Sign Up Failed" : "Sign In Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Google Sign In Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {isSignUp ? "Sign up with Google" : "Sign in with Google"}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignUp && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Doe"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                placeholder="(555) 123-4567"
              />
            </div>
          </>
        )}
        
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="john@example.com"
          />
        </div>
        
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
        </Button>
      </form>
    </div>
  );
};
