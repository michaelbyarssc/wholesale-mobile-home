
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessSettings } from './settings/BusinessSettings';
import { EmailTemplates } from './settings/EmailTemplates';
import { OwnTruScraper } from './OwnTruScraper';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const SettingsTab = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value');

      if (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
        return;
      }

      const settingsMap: Record<string, string> = {};
      data?.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });

      setSettings(settingsMap);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[key]) {
      setValidationErrors(prev => ({
        ...prev,
        [key]: ''
      }));
    }
  };

  const validateSetting = (key: string, value: string): string => {
    switch (key) {
      case 'business_name':
        if (!value.trim()) return 'Business name is required';
        if (value.length < 2) return 'Business name must be at least 2 characters';
        break;
      case 'business_email':
        if (!value.trim()) return 'Business email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        break;
      case 'business_phone':
        if (!value.trim()) return 'Business phone is required';
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
        break;
    }
    return '';
  };

  const handleInputBlur = async (key: string, value: string) => {
    const error = validateSetting(key, value);
    if (error) {
      setValidationErrors(prev => ({
        ...prev,
        [key]: error
      }));
      return;
    }

    await updateSetting(key, value);
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('admin_settings')
        .upsert({
          setting_key: key,
          setting_value: value,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating setting:', error);
        toast({
          title: "Error",
          description: `Failed to update ${key}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Setting updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: `Failed to update ${key}`,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <BusinessSettings
          settings={settings}
          validationErrors={validationErrors}
          onInputChange={handleInputChange}
          onInputBlur={handleInputBlur}
        />
        <EmailTemplates
          settings={settings}
          onInputChange={handleInputChange}
          onUpdateSetting={updateSetting}
        />
        <OwnTruScraper />
      </div>
    </div>
  );
};
