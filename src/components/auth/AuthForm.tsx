
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
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
  isAddUserMode?: boolean;
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
  isAddUserMode = false,
}: AuthFormProps) => {
  const { toast } = useToast();
  const { signIn, signUp } = useMultiUserAuth();

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

        // Proceed with signup
        const { error } = await signUp(email, password, {
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        });

        if (error) throw error;

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
          }
        } catch (notificationError) {
          console.error('Failed to send admin notification:', notificationError);
        }

        toast({
          title: "Account Created Successfully",
          description: isAddUserMode 
            ? "New user account created and is pending admin approval."
            : "Your account has been created and is pending admin approval. You will receive an email once approved.",
        });
      } else {
        // Sign in process using multi-user auth
        const { error } = await signIn(email, password);

        if (error) throw error;

        toast({
          title: isAddUserMode ? "User Added Successfully!" : "Welcome back!",
          description: isAddUserMode 
            ? "The new user has been added to this browser session."
            : "You have successfully signed in.",
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
