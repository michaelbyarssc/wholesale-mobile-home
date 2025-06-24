import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateEmail, validatePhone, sanitizeInput } from '@/utils/security';
import { Save } from 'lucide-react';
import { BusinessSettings } from './settings/BusinessSettings';
import { EmailTemplates } from './settings/EmailTemplates';

interface AdminSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
}

export const SettingsTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { data: adminSettings = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .order('setting_key', { ascending: true });
      
      if (error) throw error;
      
      // Convert to object for easier handling
      const settingsObj: Record<string, string> = {};
      data.forEach((setting: AdminSetting) => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      setSettings(settingsObj);
      
      return data as AdminSetting[];
    }
  });

  const validateSetting = (key: string, value: string): string | null => {
    const sanitizedValue = sanitizeInput(value);
    
    switch (key) {
      case 'business_email':
        if (!validateEmail(sanitizedValue)) {
          return 'Please enter a valid email address';
        }
        break;
      case 'business_phone':
        if (sanitizedValue && !validatePhone(sanitizedValue)) {
          return 'Please enter a valid 10-digit phone number';
        }
        break;
      case 'business_name':
        if (sanitizedValue.length < 2) {
          return 'Business name must be at least 2 characters long';
        }
        break;
      default:
        break;
    }
    
    return null;
  };

  const validateAllSettings = (): boolean => {
    const errors: Record<string, string> = {};
    let hasErrors = false;

    Object.entries(settings).forEach(([key, value]) => {
      const error = validateSetting(key, value);
      if (error) {
        errors[key] = error;
        hasErrors = true;
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  const saveAllSettings = async () => {
    if (!validateAllSettings()) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update all settings
      for (const [key, value] of Object.entries(settings)) {
        const sanitizedValue = sanitizeInput(value);
        
        const { error } = await supabase
          .from('admin_settings')
          .update({ setting_value: sanitizedValue })
          .eq('setting_key', key);

        if (error) throw error;

        // Log admin action
        await supabase.from('admin_audit_log').insert({
          action: 'UPDATE_SETTING',
          table_name: 'admin_settings',
          new_values: { setting_key: key, setting_value: sanitizedValue }
        });
      }

      toast({
        title: "Success",
        description: "All settings saved successfully.",
      });

      refetch();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    const sanitizedValue = sanitizeInput(value);
    const validationError = validateSetting(key, sanitizedValue);
    
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, [key]: validationError }));
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    // Clear validation error if validation passes
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: sanitizedValue })
        .eq('setting_key', key);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        action: 'UPDATE_SETTING',
        table_name: 'admin_settings',
        new_values: { setting_key: key, setting_value: sanitizedValue }
      });

      toast({
        title: "Success",
        description: "Setting updated successfully.",
      });

      refetch();
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({
        title: "Error",
        description: "Failed to update setting.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[key]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  const handleInputBlur = (key: string, value: string) => {
    const validationError = validateSetting(key, value);
    if (validationError) {
      setValidationErrors(prev => ({ ...prev, [key]: validationError }));
    } else {
      updateSetting(key, value);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Settings</h2>
        <Button 
          onClick={saveAllSettings}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

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
    </div>
  );
};
