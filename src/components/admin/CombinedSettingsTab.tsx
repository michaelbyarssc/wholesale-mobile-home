import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SettingsTab } from './SettingsTab';
import { SuperAdminMarkupTab } from './SuperAdminMarkupTab';
import { Settings, Shield } from 'lucide-react';

interface CombinedSettingsTabProps {
  isSuperAdmin: boolean;
}

export const CombinedSettingsTab = ({ isSuperAdmin }: CombinedSettingsTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings & Administration</h2>
          <p className="text-muted-foreground">
            Manage system settings and administrative controls
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General Settings
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Super Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <SettingsTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="admin" className="space-y-4">
            <SuperAdminMarkupTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};