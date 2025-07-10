import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AutomationTemplateForm } from "./AutomationTemplateForm";
import { Plus, Edit, Trash2, Clock, Zap, Users, Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  created_at: string;
  automation_message_templates?: {
    name: string;
    template_type: string;
  };
}

interface MessageTemplate {
  id: string;
  name: string;
  template_type: string;
}

export function AutomationTemplateManager() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [templatesResponse, messageTemplatesResponse] = await Promise.all([
        supabase
          .from('automation_templates')
          .select(`
            *,
            automation_message_templates(name, template_type)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('automation_message_templates')
          .select('id, name, template_type')
          .eq('active', true)
          .order('name')
      ]);

      if (templatesResponse.error) throw templatesResponse.error;
      if (messageTemplatesResponse.error) throw messageTemplatesResponse.error;

      setTemplates(templatesResponse.data || []);
      setMessageTemplates(messageTemplatesResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load automation templates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('automation_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Automation template deleted successfully",
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete automation template",
        variant: "destructive"
      });
    }
  };

  const handleToggleActive = async (templateId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_templates')
        .update({ active: !currentActive })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Automation ${!currentActive ? 'activated' : 'deactivated'} successfully`,
      });

      fetchData();
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update automation status",
        variant: "destructive"
      });
    }
  };

  const handleFormSubmit = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
    fetchData();
  };

  const handleFormCancel = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTemplate(null);
  };

  const formatTriggerInfo = (template: AutomationTemplate) => {
    if (template.trigger_type === 'time_based') {
      const days = template.trigger_delay_days;
      const hours = template.trigger_delay_hours;
      let delay = '';
      if (days > 0) delay += `${days}d `;
      if (hours > 0) delay += `${hours}h`;
      return delay || 'Immediate';
    }
    return 'Event-based';
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Automation Rules</h3>
          <p className="text-muted-foreground">Create and manage automation rules that trigger message templates</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation Rule</DialogTitle>
            </DialogHeader>
            <AutomationTemplateForm 
              messageTemplates={messageTemplates}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No automation rules yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first automation rule to start sending automated messages
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Message Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Max Executions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-muted-foreground">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {template.trigger_type === 'time_based' ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      <span className="capitalize">{template.trigger_event.replace('_', ' ')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatTriggerInfo(template)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span className="capitalize">{template.target_audience}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.automation_message_templates ? (
                      <div>
                        <div className="font-medium">
                          {template.automation_message_templates.name}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {template.automation_message_templates.template_type}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No template assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={template.active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(template.id, template.active)}
                    >
                      {template.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {template.max_executions_per_lead || 'Unlimited'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog open={isEditDialogOpen && selectedTemplate?.id === template.id} onOpenChange={(open) => {
                        setIsEditDialogOpen(open);
                        if (!open) setSelectedTemplate(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Edit Automation Rule</DialogTitle>
                          </DialogHeader>
                          <AutomationTemplateForm 
                            template={selectedTemplate}
                            messageTemplates={messageTemplates}
                            onSubmit={handleFormSubmit}
                            onCancel={handleFormCancel}
                          />
                        </DialogContent>
                      </Dialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{template.name}"? This action cannot be undone and will stop all associated automated messages.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(template.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}