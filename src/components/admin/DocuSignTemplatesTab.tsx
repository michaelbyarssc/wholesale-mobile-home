import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit3, Trash2, FileText, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface DocuSignTemplate {
  id: string;
  name: string;
  template_id: string;
  description: string | null;
  template_type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface TemplateFormData {
  name: string;
  template_id: string;
  description: string;
  template_type: string;
  active: boolean;
}

export function DocuSignTemplatesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocuSignTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    template_id: '',
    description: '',
    template_type: 'estimate',
    active: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch DocuSign templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['docusign-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('docusign_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DocuSignTemplate[];
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('docusign_templates')
        .insert([{
          ...templateData,
          created_by: user?.id
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docusign-templates'] });
      toast({
        title: "Success",
        description: "DocuSign template created successfully",
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
      console.error('Error creating template:', error);
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateFormData> }) => {
      const { error } = await supabase
        .from('docusign_templates')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docusign-templates'] });
      toast({
        title: "Success",
        description: "DocuSign template updated successfully",
      });
      resetForm();
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
      console.error('Error updating template:', error);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('docusign_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docusign-templates'] });
      toast({
        title: "Success",
        description: "DocuSign template deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
      console.error('Error deleting template:', error);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      template_id: '',
      description: '',
      template_type: 'estimate',
      active: true,
    });
    setEditingTemplate(null);
  };

  const handleEdit = (template: DocuSignTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_id: template.template_id,
      description: template.description || '',
      template_type: template.template_type,
      active: template.active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.template_id.trim()) {
      toast({
        title: "Error",
        description: "Name and Template ID are required",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({ 
        id: editingTemplate.id, 
        data: formData 
      });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const toggleActive = (template: DocuSignTemplate) => {
    updateTemplateMutation.mutate({
      id: template.id,
      data: { active: !template.active }
    });
  };

  if (isLoading) {
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
          <h2 className="text-2xl font-bold">DocuSign Templates</h2>
          <p className="text-muted-foreground">
            Manage your DocuSign templates for estimates and invoices
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Add New Template'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Standard Estimate Template"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template_id">DocuSign Template ID</Label>
                <Input
                  id="template_id"
                  value={formData.template_id}
                  onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                  placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Get this from your DocuSign account under Templates
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template_type">Template Type</Label>
                <Select 
                  value={formData.template_type} 
                  onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estimate">Estimate</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="agreement">Agreement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of when to use this template"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {templates?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by adding your first DocuSign template
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates?.map((template) => (
            <Card key={template.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.template_type === 'estimate' ? 'default' : 'secondary'}>
                        {template.template_type}
                      </Badge>
                      <Badge variant={template.active ? 'default' : 'outline'}>
                        {template.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Template ID</p>
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded text-xs break-all">
                    {template.template_id}
                  </p>
                </div>
                
                {template.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{template.description}</p>
                  </div>
                )}

                <div className="pt-2 border-t flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(template)}
                    disabled={updateTemplateMutation.isPending}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {template.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}