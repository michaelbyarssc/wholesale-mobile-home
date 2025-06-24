
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface BusinessSettingsProps {
  settings: Record<string, string>;
  validationErrors: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  onInputBlur: (key: string, value: string) => void;
}

export const BusinessSettings: React.FC<BusinessSettingsProps> = ({
  settings,
  validationErrors,
  onInputChange,
  onInputBlur,
}) => {
  return (
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
              onChange={(e) => onInputChange('business_name', e.target.value)}
              onBlur={(e) => onInputBlur('business_name', e.target.value)}
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
              onChange={(e) => onInputChange('business_phone', e.target.value)}
              onBlur={(e) => onInputBlur('business_phone', e.target.value)}
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
              onChange={(e) => onInputChange('business_email', e.target.value)}
              onBlur={(e) => onInputBlur('business_email', e.target.value)}
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
  );
};
