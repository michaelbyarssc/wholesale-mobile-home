import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CRMDashboard } from './CRMDashboard';
import { AdminCalendarDashboard } from './calendar/AdminCalendarDashboard';
import { DocuSignTemplatesTab } from './DocuSignTemplatesTab';
import { CRMAutomationWrapper } from './automation/CRMAutomationWrapper';
import { Calendar, Users, FileSignature, Zap } from 'lucide-react';

interface CombinedCRMTabProps {
  userRole: 'admin' | 'super_admin';
  currentUserId?: string;
}

export const CombinedCRMTab = ({ userRole, currentUserId }: CombinedCRMTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">CRM & Operations</h2>
          <p className="text-muted-foreground">
            Manage customer relationships, schedule appointments, and handle documents
          </p>
        </div>
      </div>

      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Leads & CRM
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="docusign" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            DocuSign
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          <CRMDashboard 
            userRole={userRole} 
            currentUserId={currentUserId} 
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <AdminCalendarDashboard 
            userRole={userRole} 
            currentUserId={currentUserId} 
          />
        </TabsContent>

        <TabsContent value="docusign" className="space-y-4">
          <DocuSignTemplatesTab />
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <CRMAutomationWrapper />
        </TabsContent>
      </Tabs>
    </div>
  );
};