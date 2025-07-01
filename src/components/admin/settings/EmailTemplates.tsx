
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
        <CardTitle>Email & SMS Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="estimate_email_template">Email Template</Label>
          <Textarea
            id="estimate_email_template"
            name="estimate_email_template"
            value={settings.estimate_email_template || ''}
            onChange={(e) => onInputChange('estimate_email_template', e.target.value)}
            onBlur={(e) => onUpdateSetting('estimate_email_template', e.target.value)}
            rows={4}
            placeholder="Email template for sending estimates..."
          />
        </div>
        
        <div>
          <Label htmlFor="estimate_sms_template">SMS Template</Label>
          <Textarea
            id="estimate_sms_template"
            name="estimate_sms_template"
            value={settings.estimate_sms_template || ''}
            onChange={(e) => onInputChange('estimate_sms_template', e.target.value)}
            onBlur={(e) => onUpdateSetting('estimate_sms_template', e.target.value)}
            rows={3}
            placeholder="SMS template for sending estimates... Use ${total} for dynamic total amount."
          />
        </div>
      </CardContent>
    </Card>
  );
};
