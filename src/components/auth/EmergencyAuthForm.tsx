import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield } from 'lucide-react';
import { useEmergencyAuth } from '@/hooks/useEmergencyAuth';

interface EmergencyAuthFormProps {
  onBack: () => void;
}

export const EmergencyAuthForm: React.FC<EmergencyAuthFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { emergencySignIn, emergencyCleanup, isLoading } = useEmergencyAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    await emergencySignIn(email, password);
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertTriangle className="h-5 w-5" />
          Emergency Authentication
        </CardTitle>
        <CardDescription className="text-orange-700">
          Bypass multi-user authentication system. Use only if you cannot access the admin panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emergency-email">Email</Label>
            <Input
              id="emergency-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your admin email"
              className="border-orange-200 focus:border-orange-400"
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="emergency-password">Password</Label>
            <Input
              id="emergency-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="border-orange-200 focus:border-orange-400"
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Signing In...' : 'Emergency Sign In'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={emergencyCleanup}
              disabled={isLoading}
              className="w-full border-red-200 text-red-700 hover:bg-red-50"
            >
              Emergency Cleanup
            </Button>
          </div>
        </form>

        <div className="border-t pt-4">
          <Button
            onClick={onBack}
            variant="ghost"
            className="w-full text-gray-600 hover:text-gray-800"
            disabled={isLoading}
          >
            Back to Normal Login
          </Button>
        </div>

        <div className="text-xs text-orange-600 bg-orange-100 p-3 rounded">
          <Shield className="h-4 w-4 inline mr-1" />
          This emergency mode bypasses the multi-user authentication system and should only be used when necessary.
        </div>
      </CardContent>
    </Card>
  );
};