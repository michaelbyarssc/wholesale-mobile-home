
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ForgotPasswordFormProps {
  email: string;
  setEmail: (email: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onBack: () => void;
  resetForm: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  email,
  setEmail,
  loading,
  setLoading,
  onBack,
  resetForm,
}) => {
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email.trim()) {
        toast({
          title: "Email Required",
          description: "Please enter your email address.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions.",
      });

      // Go back to sign in form
      onBack();
      resetForm();
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Reset Error",
        description: error.message || "An error occurred while sending reset email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <Button 
        type="submit" 
        className="w-full bg-blue-600 hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Reset Email'}
      </Button>
    </form>
  );
};
