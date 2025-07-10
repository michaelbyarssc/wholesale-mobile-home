import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Plus, Settings, MessageSquare, Mail, Clock, Zap } from "lucide-react";
import { AutomationTemplateForm } from "./automation/AutomationTemplateForm";
import { MessageTemplateForm } from "./automation/MessageTemplateForm";
import { AutomationExecutions } from "./automation/AutomationExecutions";
import { AutomationSettings } from "./automation/AutomationSettings";

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_event: string;
  trigger_delay_days: number;
  trigger_delay_hours: number;
  target_audience: string;
  active: boolean;
  max_executions_per_lead: number;
  message_template_id: string;
  message_template?: {
    name: string;
    template_type: string;
  };
}

interface MessageTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  content: string;
  variables: any;
  active: boolean;
}

interface AutomationExecution {
  id: string;
  automation_template: {
    name: string;
  };
  customer_email: string;
  customer_phone: string;
  scheduled_for: string;
  executed_at: string;
  status: string;
  error_message: string;
  message_content: string;
  message_subject: string;
}

export function AutomationTab() {
  const { toast } = useToast();
  const [automationTemplates, setAutomationTemplates] = useState<AutomationTemplate[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AutomationTemplate | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageTemplate | null>(null);

  const fetchAutomationTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_templates')
        .select(`
          *,
          message_template:automation_message_templates(name, template_type)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomationTemplates(data || []);
    } catch (error) {
      console.error('Error fetching automation templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automation templates",
        variant: "destructive",
      });
    }
  };

  const fetchMessageTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessageTemplates(data || []);
    } catch (error) {
      console.error('Error fetching message templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch message templates",
        variant: "destructive",
      });
    }
  };

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_executions')
        .select(`
          *,
          automation_template:automation_templates(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching executions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automation executions",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAutomationTemplates(),
        fetchMessageTemplates(),
        fetchExecutions()
      ]);
      setLoading(false);
    };

    fetchData();
  }, []);

  const toggleAutomationStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_templates')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      await fetchAutomationTemplates();
      toast({
        title: "Success",
        description: `Automation ${!currentStatus ? 'activated' : 'paused'}`,
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        title: "Error",
        description: "Failed to update automation status",
        variant: "destructive",
      });
    }
  };

  const handleTemplateSubmit = async () => {
    setShowTemplateForm(false);
    setEditingTemplate(null);
    await fetchAutomationTemplates();
  };

  const handleMessageSubmit = async () => {
    setShowMessageForm(false);
    setEditingMessage(null);
    await fetchMessageTemplates();
  };

  const getTriggerDescription = (template: AutomationTemplate) => {
    if (template.trigger_type === 'time_based') {
      const totalHours = (template.trigger_delay_days || 0) * 24 + (template.trigger_delay_hours || 0);
      if (totalHours === 0) return 'Immediate';
      if (totalHours < 24) return `${totalHours} hour(s) after ${template.trigger_event.replace('_', ' ')}`;
      return `${template.trigger_delay_days} day(s) after ${template.trigger_event.replace('_', ' ')}`;
    }
    return `When ${template.trigger_event.replace('_', ' ')}`;
  };

  if (loading) {
    return <div className="p-6">Loading automation data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">CRM Automations</h2>
          <p className="text-muted-foreground">
            Manage automated email and SMS campaigns for leads and customers
          </p>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automation Rules
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Message Templates
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Execution History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Automation Templates</h3>
            <Button onClick={() => setShowTemplateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Automation
            </Button>
          </div>

          <div className="grid gap-4">
            {automationTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.active ? "default" : "secondary"}>
                        {template.active ? "Active" : "Paused"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAutomationStatus(template.id, template.active)}
                      >
                        {template.active ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowTemplateForm(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Trigger:</span>
                      <p className="text-muted-foreground">
                        {getTriggerDescription(template)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Message Type:</span>
                      <div className="flex items-center gap-1 mt-1">
                        {template.message_template?.template_type === 'email' ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        <span className="capitalize">
                          {template.message_template?.template_type}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Audience:</span>
                      <p className="text-muted-foreground capitalize">
                        {template.target_audience}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Max per Lead:</span>
                      <p className="text-muted-foreground">
                        {template.max_executions_per_lead || 'Unlimited'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {showTemplateForm && (
            <AutomationTemplateForm
              template={editingTemplate}
              messageTemplates={messageTemplates}
              onSubmit={handleTemplateSubmit}
              onCancel={() => {
                setShowTemplateForm(false);
                setEditingTemplate(null);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Message Templates</h3>
            <Button onClick={() => setShowMessageForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>

          <div className="grid gap-4">
            {messageTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {template.template_type === 'email' ? (
                          <Mail className="h-5 w-5" />
                        ) : (
                          <MessageSquare className="h-5 w-5" />
                        )}
                        {template.name}
                      </CardTitle>
                      {template.subject && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Subject: {template.subject}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.active ? "default" : "secondary"}>
                        {template.active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMessage(template);
                          setShowMessageForm(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Content Preview:</span>
                      <p className="text-sm text-muted-foreground bg-muted p-2 rounded mt-1 line-clamp-3">
                        {template.content}
                      </p>
                    </div>
                    {template.variables.length > 0 && (
                      <div>
                        <span className="font-medium">Available Variables:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {showMessageForm && (
            <MessageTemplateForm
              template={editingMessage}
              onSubmit={handleMessageSubmit}
              onCancel={() => {
                setShowMessageForm(false);
                setEditingMessage(null);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="executions">
          <AutomationExecutions executions={executions} onRefresh={fetchExecutions} />
        </TabsContent>

        <TabsContent value="settings">
          <AutomationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}