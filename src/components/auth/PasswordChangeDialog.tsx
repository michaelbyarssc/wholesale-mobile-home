
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validatePasswordComplexity } from '@/utils/security';
import { Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';

interface PasswordChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isFirstLogin?: boolean;
}

export const PasswordChangeDialog = ({ isOpen, onClose, isFirstLogin = false }: PasswordChangeDialogProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!isFirstLogin && !currentPassword.trim()) {
      newErrors.push('Current password is required');
    }

    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.isValid) {
      newErrors.push(...passwordValidation.errors);
    }

    if (newPassword !== confirmPassword) {
      newErrors.push('New password and confirmation must match');
    }

    if (currentPassword === newPassword) {
      newErrors.push('New password must be different from current password');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Your password has been updated successfully.",
      });

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors([]);
      onClose();

    } catch (error: any) {
      console.error('Password change error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = validatePasswordComplexity(newPassword);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isFirstLogin ? 'Set Your Password' : 'Change Password'}
          </DialogTitle>
          <DialogDescription>
            {isFirstLogin 
              ? 'Please set a secure password for your account.'
              : 'Update your password to keep your account secure.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isFirstLogin && (
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-medium">Password Requirements:</div>
                <div className="space-y-1">
                  <div className={`flex items-center text-xs ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    At least 8 characters
                  </div>
                  <div className={`flex items-center text-xs ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    One uppercase letter
                  </div>
                  <div className={`flex items-center text-xs ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    One lowercase letter
                  </div>
                  <div className={`flex items-center text-xs ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    One number
                  </div>
                  <div className={`flex items-center text-xs ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'text-green-600' : 'text-gray-400'}`}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    One special character
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            {!isFirstLogin && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isLoading || !passwordStrength.isValid}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
