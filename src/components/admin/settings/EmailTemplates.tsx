
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EmailTemplatesProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  onUpdateSetting: (key: string, value: string) => void;
}

export const EmailTemplates: React.FC<EmailTemplatesProps> = ({
  settings,
  onInputChange,
  onUpdateSetting,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Email & Branding Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="business_name">Business Name</Label>
            <Textarea
              id="business_name"
              value={settings.business_name || ''}
              onChange={(e) => onInputChange('business_name', e.target.value)}
              onBlur={(e) => onUpdateSetting('business_name', e.target.value)}
              rows={1}
              placeholder="Your Business Name"
            />
          </div>
          
          <div>
            <Label htmlFor="business_logo">Business Logo URL</Label>
            <Textarea
              id="business_logo"
              value={settings.business_logo || ''}
              onChange={(e) => onInputChange('business_logo', e.target.value)}
              onBlur={(e) => onUpdateSetting('business_logo', e.target.value)}
              rows={1}
              placeholder="https://example.com/logo.png"
            />
          </div>
          
          <div>
            <Label htmlFor="business_address">Business Address</Label>
            <Textarea
              id="business_address"
              value={settings.business_address || ''}
              onChange={(e) => onInputChange('business_address', e.target.value)}
              onBlur={(e) => onUpdateSetting('business_address', e.target.value)}
              rows={2}
              placeholder="123 Main St, City, State 12345"
            />
          </div>
          
          <div>
            <Label htmlFor="business_phone">Business Phone</Label>
            <Textarea
              id="business_phone"
              value={settings.business_phone || ''}
              onChange={(e) => onInputChange('business_phone', e.target.value)}
              onBlur={(e) => onUpdateSetting('business_phone', e.target.value)}
              rows={1}
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div>
            <Label htmlFor="business_email">Business Email</Label>
            <Textarea
              id="business_email"
              value={settings.business_email || ''}
              onChange={(e) => onInputChange('business_email', e.target.value)}
              onBlur={(e) => onUpdateSetting('business_email', e.target.value)}
              rows={1}
              placeholder="contact@yourbusiness.com"
            />
          </div>
        </div>
        
        <div className="border-t pt-6">
          <h4 className="text-lg font-semibold mb-4">Legacy Templates (Deprecated)</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Note: Professional React Email templates are now used by default. These legacy templates are maintained for compatibility only.
          </p>
          
          <div className="space-y-4 opacity-60">
            <div>
              <Label htmlFor="estimate_email_template">Legacy Email Template</Label>
              <Textarea
                id="estimate_email_template"
                value={settings.estimate_email_template || ''}
                onChange={(e) => onInputChange('estimate_email_template', e.target.value)}
                onBlur={(e) => onUpdateSetting('estimate_email_template', e.target.value)}
                rows={4}
                placeholder="Legacy email template (not used with new React Email templates)..."
                disabled
              />
            </div>
            
            <div>
              <Label htmlFor="estimate_sms_template">SMS Template</Label>
              <Textarea
                id="estimate_sms_template"
                value={settings.estimate_sms_template || ''}
                onChange={(e) => onInputChange('estimate_sms_template', e.target.value)}
                onBlur={(e) => onUpdateSetting('estimate_sms_template', e.target.value)}
                rows={3}
                placeholder="SMS template for sending estimates... Use ${total} for dynamic total amount."
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
