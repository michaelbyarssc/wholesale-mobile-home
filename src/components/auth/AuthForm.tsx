
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Starting sign up process...');
        
        // First check if user was previously denied
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('profiles')
          .select('denied, user_id, approved')
          .eq('email', email)
          .single();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error('Error checking existing profile:', profileCheckError);
        }

        // If user was denied, reset their denial status and allow re-registration
        if (existingProfile && existingProfile.denied) {
          console.log('User was previously denied, resetting denial status...');
          
          const { error: resetError } = await supabase
            .from('profiles')
            .update({
              denied: false,
              denied_at: null,
              denied_by: null,
              approved: false,
              approved_at: null,
              approved_by: null,
              first_name: firstName,
              last_name: lastName
            })
            .eq('user_id', existingProfile.user_id);

          if (resetError) {
            console.error('Error resetting denial status:', resetError);
            throw new Error('Failed to reset account status');
          }

          toast({
            title: "Account Reset",
            description: "Your account status has been reset. You can now request approval again.",
          });

          // Send notification to admin about re-registration
          try {
            const { error: notificationError } = await supabase.functions.invoke('send-new-user-notification', {
              body: {
                firstName,
                lastName,
                email,
                phoneNumber,
                isReregistration: true,
              },
            });

            if (notificationError) {
              console.error('Notification error:', notificationError);
            }
          } catch (notificationError) {
            console.error('Failed to send admin notification:', notificationError);
          }

          toast({
            title: "Re-registration Submitted",
            description: "Your request for approval has been submitted again. You will receive an email once approved.",
          });

          setLoading(false);
          return;
        }

        // If user already exists and is not denied, check if they're already approved
        if (existingProfile && !existingProfile.denied) {
          if (existingProfile.approved) {
            toast({
              title: "Account Already Exists",
              description: "Your account is already approved. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Account Pending",
              description: "Your account is already pending approval. Please wait for admin approval.",
              variant: "destructive",
            });
          }
          setLoading(false);
          return;
        }

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
            .select('approved, denied')
            .eq('user_id', data.user.id)
            .single();

          if (profileError) {
            console.error('Error checking approval status:', profileError);
          } else if (profileData) {
            if (profileData.denied) {
              // Sign out the user immediately
              await supabase.auth.signOut();
              toast({
                title: "Access Denied",
                description: "Your account has been denied access. Please contact an administrator or sign up again to request approval.",
                variant: "destructive",
              });
              setLoading(false);
              return;
            } else if (!profileData.approved) {
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
  );
};
