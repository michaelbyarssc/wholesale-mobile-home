import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AutomationTemplateForm } from './AutomationTemplateForm';
import { MessageTemplateForm } from './MessageTemplateForm';
import { AutomationExecutions } from './AutomationExecutions';
import { AutomationSettings } from './AutomationSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CalendarAutomationWrapper = () => {
  const { toast } = useToast();
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [messageTemplatesData, executionsData] = await Promise.all([
        supabase
          .from('automation_message_templates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('automation_executions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (messageTemplatesData.error) throw messageTemplatesData.error;
      if (executionsData.error) throw executionsData.error;

      setMessageTemplates(messageTemplatesData.data || []);
      setExecutions(executionsData.data || []);
    } catch (error) {
      console.error('Error fetching automation data:', error);
      toast({
        title: "Error",
        description: "Failed to load automation data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleSubmit = () => {
    fetchData(); // Refresh data after submission
  };

  const handleCancel = () => {
    // Handle cancel action
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Appointment Automations</h3>
        <p className="text-muted-foreground">Set up automated reminders and follow-ups for scheduled appointments.</p>
      </div>
      
      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Automation Rules</TabsTrigger>
          <TabsTrigger value="messages">Message Templates</TabsTrigger>
          <TabsTrigger value="executions">Executions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <AutomationTemplateForm 
            messageTemplates={messageTemplates}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessageTemplateForm 
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </TabsContent>

        <TabsContent value="executions" className="mt-4">
          <AutomationExecutions 
            executions={executions}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <AutomationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};