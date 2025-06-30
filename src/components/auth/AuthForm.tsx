
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validatePasswordComplexity, isPasswordStrengthResponse } from '@/utils/security';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const AuthForm: React.FC<AuthFormProps> = ({
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
}) => {
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Validate all required fields for sign up
        if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
          toast({
            title: "Missing Information",
            description: "Please fill in all required fields.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Enhanced password validation for sign up
        const passwordValidation = validatePasswordComplexity(password);
        if (!passwordValidation.isValid) {
          toast({
            title: "Password Requirements Not Met",
            description: passwordValidation.errors.join(', '),
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Additional server-side validation
        try {
          const { data: strengthCheck } = await supabase.rpc('check_password_strength', {
            password: password
          });

          if (strengthCheck && isPasswordStrengthResponse(strengthCheck) && !strengthCheck.valid) {
            toast({
              title: "Password Security Check Failed",
              description: strengthCheck.errors.join(', '),
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Password strength check error:', error);
          // Continue with client-side validation if server check fails
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone_number: phoneNumber.trim()
            }
          }
        });
        
        if (error) throw error;

        // Send notification to admin about new user registration
        try {
          await supabase.functions.invoke('send-new-user-notification', {
            body: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email,
              phoneNumber: phoneNumber.trim()
            }
          });
        } catch (notificationError) {
          console.error('Failed to send admin notification:', notificationError);
          // Don't block registration if notification fails
        }
        
        toast({
          title: "Registration Submitted!",
          description: "Your account has been created and is pending admin approval. You'll be able to sign in once approved.",
        });
      } else {
        // Check if user is approved before allowing sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;

        // Check if user is approved
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('approved, first_name, last_name')
          .eq('email', email)
          .single();

        if (profileError) {
          console.error('Profile check error:', profileError);
          throw new Error('Unable to verify account status');
        }

        if (!profile.approved) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          toast({
            title: "Account Pending Approval",
            description: "Your account is awaiting admin approval. Please contact an administrator.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        toast({
          title: "Welcome back!",
          description: "You have been successfully signed in.",
        });
        // Navigation will be handled by the auth state change listener
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "An error occurred during authentication.",
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
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="Enter your first name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Enter your last name"
            />
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              placeholder="Enter your phone number"
            />
          </div>
        </>
      )}
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email address"
        />
      </div>
      <div>
        <Label htmlFor="password">Password *</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
        />
        {isSignUp && password && (
          <div className="mt-2 text-xs text-gray-600">
            Password must be at least 8 characters with uppercase, lowercase, number, and special character.
          </div>
        )}
      </div>
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
      </Button>
    </form>
  );
};
