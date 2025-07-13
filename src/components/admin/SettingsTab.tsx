
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessSettings } from './settings/BusinessSettings';
import { NotificationSettings } from './settings/NotificationSettings';
import { EmailTemplates } from './settings/EmailTemplates';
import { DocuSignSettings } from './settings/DocuSignSettings';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const SettingsTab = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      // First try to update existing record
      const { data: existingData, error: selectError } = await supabase
        .from('admin_settings')
        .select('id')
        .eq('setting_key', key)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing setting:', selectError);
        throw selectError;
      }

      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('admin_settings')
          .update({
            setting_value: value,
            updated_at: new Date().toISOString()
          })
          .eq('setting_key', key);

        if (updateError) {
          console.error('Error updating setting:', updateError);
          throw updateError;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('admin_settings')
          .insert({
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error inserting setting:', insertError);
          throw insertError;
        }
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Validate all settings first
      const errors: Record<string, string> = {};
      const businessSettings = ['business_name', 'business_email', 'business_phone'];
      
      for (const key of businessSettings) {
        const value = settings[key] || '';
        const error = validateSetting(key, value);
        if (error) {
          errors[key] = error;
        }
      }

      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        toast({
          title: "Validation Error",
          description: "Please fix the validation errors before saving",
          variant: "destructive",
        });
        return;
      }

      // Save all business settings
      for (const key of businessSettings) {
        if (settings[key]) {
          await updateSetting(key, settings[key]);
        }
      }

      toast({
        title: "Success",
        description: "Business settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
          onSave={handleSave}
          isSaving={isSaving}
        />
        <NotificationSettings />
        <DocuSignSettings
          settings={settings}
          onInputChange={handleInputChange}
          onUpdateSetting={updateSetting}
        />
        <EmailTemplates
          settings={settings}
          onInputChange={handleInputChange}
          onUpdateSetting={updateSetting}
        />
      </div>
    </div>
  );
};
