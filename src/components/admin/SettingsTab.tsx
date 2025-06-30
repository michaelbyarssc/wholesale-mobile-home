
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BusinessSettings } from './settings/BusinessSettings';
import { EmailTemplates } from './settings/EmailTemplates';
import { OwnTruScraper } from './OwnTruScraper';

export const SettingsTab = () => {
  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        <BusinessSettings />
        <EmailTemplates />
        <OwnTruScraper />
      </div>
    </div>
  );
};
