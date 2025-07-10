import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";

interface MessageTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  content: string;
  variables: any;
  active: boolean;
}

interface MessageTemplateFormProps {
  template?: MessageTemplate | null;
  onSubmit: () => void;
  onCancel: () => void;
}

const availableVariables = [
  'customer_name',
  'customer_email',
  'customer_phone',
  'business_name',
  'agent_name',
  'appointment_date',
  'appointment_time',
  'appointment_location',
  'mobile_home_model',
  'mobile_home_price',
  'estimate_amount',
  'expiration_date',
];

export function MessageTemplateForm({ template, onSubmit, onCancel }: MessageTemplateFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: template?.name || '',
    template_type: template?.template_type || 'email' as 'email' | 'sms',
    subject: template?.subject || '',
    content: template?.content || '',
    variables: template?.variables || [],
    active: template?.active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (template?.id) {
        const { error } = await supabase
          .from('automation_message_templates')
          .update(formData)
          .eq('id', template.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Message template updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('automation_message_templates')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Message template created successfully",
        });
      }

      onSubmit();
    } catch (error) {
      console.error('Error saving message template:', error);
      toast({
        title: "Error",
        description: "Failed to save message template",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addVariable = (variable: string) => {
    if (!formData.variables.includes(variable)) {
      setFormData({
        ...formData,
        variables: [...formData.variables, variable]
      });
    }
  };

  const removeVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter(v => v !== variable)
    });
  };

  const insertVariableIntoContent = (variable: string) => {
    const variableText = `{{${variable}}}`;
    setFormData({
      ...formData,
      content: formData.content + variableText
    });
    addVariable(variable);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {template ? 'Edit Message Template' : 'Create Message Template'}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Welcome Email Template"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template_type">Message Type</Label>
              <Select
                value={formData.template_type}
                onValueChange={(value: 'email' | 'sms') => 
                  setFormData({ ...formData, template_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.template_type === 'email' && (
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Welcome to {{business_name}}!"
                required={formData.template_type === 'email'}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="content">Message Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Hi {{customer_name}}, welcome to our service..."
                rows={8}
                required
              />
              <p className="text-sm text-muted-foreground">
                Use variables like {`{{customer_name}}`} to personalize messages
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Available Variables</Label>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {availableVariables.map((variable) => (
                  <Button
                    key={variable}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => insertVariableIntoContent(variable)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {`{{${variable}}}`}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {formData.variables.length > 0 && (
            <div className="space-y-2">
              <Label>Used Variables</Label>
              <div className="flex flex-wrap gap-2">
                {formData.variables.map((variable) => (
                  <Badge
                    key={variable}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeVariable(variable)}
                  >
                    {`{{${variable}}}`}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}

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