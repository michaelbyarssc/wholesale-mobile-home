
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { validateEmail, validatePhone, sanitizeInput } from '@/utils/security';
import { AlertTriangle } from 'lucide-react';

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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={settings.business_name || ''}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                onBlur={(e) => handleInputBlur('business_name', e.target.value)}
                className={validationErrors.business_name ? 'border-red-500' : ''}
              />
              {validationErrors.business_name && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationErrors.business_name}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div>
              <Label htmlFor="business_phone">Business Phone</Label>
              <Input
                id="business_phone"
                value={settings.business_phone || ''}
                onChange={(e) => handleInputChange('business_phone', e.target.value)}
                onBlur={(e) => handleInputBlur('business_phone', e.target.value)}
                placeholder="(555) 123-4567"
                className={validationErrors.business_phone ? 'border-red-500' : ''}
              />
              {validationErrors.business_phone && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationErrors.business_phone}</AlertDescription>
                </Alert>
              )}
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="business_email">Business Email</Label>
              <Input
                id="business_email"
                type="email"
                value={settings.business_email || ''}
                onChange={(e) => handleInputChange('business_email', e.target.value)}
                onBlur={(e) => handleInputBlur('business_email', e.target.value)}
                className={validationErrors.business_email ? 'border-red-500' : ''}
              />
              {validationErrors.business_email && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationErrors.business_email}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email & SMS Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="estimate_email_template">Email Template</Label>
            <Textarea
              id="estimate_email_template"
              value={settings.estimate_email_template || ''}
              onChange={(e) => handleInputChange('estimate_email_template', e.target.value)}
              onBlur={(e) => updateSetting('estimate_email_template', e.target.value)}
              rows={4}
              placeholder="Email template for sending estimates..."
            />
          </div>
          
          <div>
            <Label htmlFor="estimate_sms_template">SMS Template</Label>
            <Textarea
              id="estimate_sms_template"
              value={settings.estimate_sms_template || ''}
              onChange={(e) => handleInputChange('estimate_sms_template', e.target.value)}
              onBlur={(e) => updateSetting('estimate_sms_template', e.target.value)}
              rows={3}
              placeholder="SMS template for sending estimates... Use ${total} for dynamic total amount."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
