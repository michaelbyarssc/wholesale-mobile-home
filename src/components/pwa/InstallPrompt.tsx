import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, X, Smartphone, Zap, Wifi, Star } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

interface InstallPromptProps {
  onClose?: () => void;
  variant?: 'banner' | 'card' | 'inline';
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ 
  onClose, 
  variant = 'card' 
}) => {
  const { canInstall, installApp, isInstalled } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    
    try {
      const success = await installApp();
      if (success) {
        console.log('App installed successfully!');
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onClose?.();
  };

  if (variant === 'banner') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-white p-4 shadow-lg animate-slide-in-up">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Install Wholesale Mobile Home</p>
              <p className="text-sm text-white/90">Get the app for faster browsing and offline access</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              variant="secondary"
              size="sm"
              className="bg-white text-primary hover:bg-white/90"
            >
              <Download className="h-4 w-4 mr-2" />
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Get the App</h4>
              <p className="text-sm text-gray-600">Install for a better mobile experience</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isInstalling ? 'Installing...' : 'Install'}
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-white to-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Install Our App</CardTitle>
              <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary">
                Free & Fast
              </Badge>
            </div>
          </div>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-600 mb-4">
          Get the best mobile home shopping experience with our app
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-green-600" />
            <span>Faster Loading</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-blue-600" />
            <span>Offline Access</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-yellow-600" />
            <span>App-like Feel</span>
          </div>
        </div>
        
        <Button
          onClick={handleInstall}
          disabled={isInstalling}
          className="w-full bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Download className="h-5 w-5 mr-2" />
          {isInstalling ? 'Installing App...' : 'Install App'}
        </Button>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          Works on iPhone, Android, and desktop browsers
        </p>
      </CardContent>
    </Card>
  );
};