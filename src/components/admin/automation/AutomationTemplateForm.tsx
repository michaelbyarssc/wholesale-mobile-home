import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

interface MessageTemplate {
  id: string;
  name: string;
  template_type: string;
}

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
}

interface AutomationTemplateFormProps {
  template?: AutomationTemplate | null;
  messageTemplates: MessageTemplate[];
  onSubmit: () => void;
  onCancel: () => void;
}

const triggerEvents = [
  { value: 'lead_created', label: 'Lead Created' },
  { value: 'lead_status_changed', label: 'Lead Status Changed' },
  { value: 'appointment_scheduled', label: 'Appointment Scheduled' },
  { value: 'appointment_completed', label: 'Appointment Completed' },
  { value: 'estimate_created', label: 'Estimate Created' },
  { value: 'estimate_approved', label: 'Estimate Approved' },
  { value: 'estimate_expiring', label: 'Estimate Expiring' },
];

export function AutomationTemplateForm({ 
  template, 
  messageTemplates, 
  onSubmit, 
  onCancel 
}: AutomationTemplateFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    trigger_type: template?.trigger_type || 'time_based' as 'time_based' | 'event_based',
    trigger_event: template?.trigger_event || 'lead_created',
    trigger_delay_days: template?.trigger_delay_days || 0,
    trigger_delay_hours: template?.trigger_delay_hours || 0,
    target_audience: template?.target_audience || 'leads' as 'leads' | 'customers' | 'both',
    active: template?.active ?? true,
    max_executions_per_lead: template?.max_executions_per_lead || 0,
    message_template_id: template?.message_template_id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        max_executions_per_lead: formData.max_executions_per_lead || null,
      };

      if (template?.id) {
        const { error } = await supabase
          .from('automation_templates')
          .update(submitData)
          .eq('id', template.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Automation template updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('automation_templates')
          .insert([submitData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Automation template created successfully",
        });
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving automation template:', error);
      toast({
        title: "Error",
        description: "Failed to save automation template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {template ? 'Edit Automation Template' : 'Create Automation Template'}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Welcome Email Campaign"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_audience">Target Audience</Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value: 'leads' | 'customers' | 'both') => 
                  setFormData({ ...formData, target_audience: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads Only</SelectItem>
                  <SelectItem value="customers">Customers Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this automation does..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trigger_type">Trigger Type</Label>
              <Select
                value={formData.trigger_type}
                onValueChange={(value: 'time_based' | 'event_based') => 
                  setFormData({ ...formData, trigger_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_based">Time-based</SelectItem>
                  <SelectItem value="event_based">Event-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trigger_event">Trigger Event</Label>
              <Select
                value={formData.trigger_event}
                onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggerEvents.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.trigger_type === 'time_based' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trigger_delay_days">Delay (Days)</Label>
                <Input
                  id="trigger_delay_days"
                  type="number"
                  min="0"
                  value={formData.trigger_delay_days}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    trigger_delay_days: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trigger_delay_hours">Delay (Hours)</Label>
                <Input
                  id="trigger_delay_hours"
                  type="number"
                  min="0"
                  max="23"
                  value={formData.trigger_delay_hours}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    trigger_delay_hours: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="message_template_id">Message Template</Label>
              <Select
                value={formData.message_template_id}
                onValueChange={(value) => setFormData({ ...formData, message_template_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {messageTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.template_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_executions_per_lead">Max Executions per Lead</Label>
              <Input
                id="max_executions_per_lead"
                type="number"
                min="0"
                value={formData.max_executions_per_lead}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  max_executions_per_lead: parseInt(e.target.value) || 0 
                })}
                placeholder="0 = unlimited"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
            />
            <Label htmlFor="active">Active</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (template ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}