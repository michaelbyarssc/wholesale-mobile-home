import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, FileText, Send, Eye, Clock, CheckCircle, XCircle, DollarSign, Settings, Check, X, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { EstimateLineItems } from './EstimateLineItems';

interface Estimate {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_address: string;
  total_amount: number;
  status: string;
  created_at: string;
  approved_at?: string;
  user_id: string | null;
  mobile_home_id: string | null;
  mobile_homes: {
    manufacturer: string;
    series: string;
    model: string;
    price: number;
  };
}

interface DocuSignTemplate {
  id: string;
  name: string;
  template_id: string;
  created_at: string;
  active: boolean;
}

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  price: number;
  length_feet: number;
  width_feet: number;
}

export const EstimatesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [selectedMobileHome, setSelectedMobileHome] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [estimateNotes, setEstimateNotes] = useState('');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    template_id: ''
  });
  const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch mobile homes data from database
  const [mobileHomes, setMobileHomes] = useState<any[]>([]);
  const [mobileHomesLoading, setMobileHomesLoading] = useState(true);
  
  React.useEffect(() => {
    const fetchMobileHomes = async () => {
      try {
        const { data, error } = await supabase
          .from('mobile_homes')
          .select('id, manufacturer, series, model, price, length_feet, width_feet')
          .order('manufacturer', { ascending: true });
        
        if (error) {
          console.error('Error fetching mobile homes:', error);
          setMobileHomes([]);
        } else {
          console.log('Fetched mobile homes:', data);
          setMobileHomes(data || []);
        }
      } catch (error) {
        console.error('Error in fetchMobileHomes:', error);
        setMobileHomes([]);
      } finally {
        setMobileHomesLoading(false);
      }
    };

    fetchMobileHomes();
  }, []);

  // Fetch estimates from database
  const { data: estimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: ['admin-estimates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          *,
          mobile_homes (
            manufacturer,
            series,
            model,
            price
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch DocuSign templates from database
  const { data: docusignTemplates = [] } = useQuery({
    queryKey: ['docusign-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('docusign_templates')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Create estimate mutation
  const createEstimateMutation = useMutation({
    mutationFn: async () => {
      const selectedHome = mobileHomes.find(h => h.id === selectedMobileHome);
      if (!selectedHome) throw new Error('Mobile home not found');

      const fullAddress = [
        selectedCustomer.address,
        selectedCustomer.city,
        selectedCustomer.state,
        selectedCustomer.zipCode
      ].filter(Boolean).join(', ');

      const { data, error } = await supabase
        .from('estimates')
        .insert({
          customer_name: selectedCustomer.name,
          customer_email: selectedCustomer.email,
          customer_phone: selectedCustomer.phone,
          delivery_address: fullAddress,
          mobile_home_id: selectedMobileHome,
          total_amount: selectedHome.price,
          status: 'draft',
          notes: estimateNotes
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Estimate Created",
        description: "Estimate has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create estimate. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Send estimate with DocuSign mutation
  const sendEstimateMutation = useMutation({
    mutationFn: async ({ estimateId, templateId }: { estimateId: string; templateId: string }) => {
      const { data, error } = await supabase.functions.invoke('docusign-send-estimate', {
        body: { 
          estimateId,
          templateId,
          documentType: 'estimate'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      toast({
        title: "Estimate Sent",
        description: "Estimate has been sent to customer via DocuSign.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send estimate. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Add DocuSign template mutation
  const addTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('docusign_templates')
        .insert({
          name: newTemplate.name,
          template_id: newTemplate.template_id,
          active: true
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docusign-templates'] });
      setIsTemplateDialogOpen(false);
      setNewTemplate({ name: '', template_id: '' });
      toast({
        title: "Template Added",
        description: "DocuSign template has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add template. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Approve estimate mutation
  const approveEstimateMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-estimate', {
        body: { estimate_uuid: estimateId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      toast({
        title: "Estimate Approved",
        description: "Estimate has been approved and invoice created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve estimate. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Deny estimate mutation
  const denyEstimateMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      const { data, error } = await supabase
        .from('estimates')
        .update({ status: 'rejected' })
        .eq('id', estimateId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      toast({
        title: "Estimate Denied",
        description: "Estimate has been rejected.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to deny estimate. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Edit estimate mutation
  const editEstimateMutation = useMutation({
    mutationFn: async (estimate: Partial<Estimate>) => {
      const { data, error } = await supabase
        .from('estimates')
        .update({
          customer_name: estimate.customer_name,
          customer_email: estimate.customer_email,
          customer_phone: estimate.customer_phone,
          delivery_address: estimate.delivery_address,
          total_amount: estimate.total_amount,
          mobile_home_id: estimate.mobile_home_id
        })
        .eq('id', estimate.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      setIsEditDialogOpen(false);
      setEditingEstimate(null);
      toast({
        title: "Estimate Updated",
        description: "Estimate has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update estimate. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete estimate mutation
  const deleteEstimateMutation = useMutation({
    mutationFn: async (estimateId: string) => {
      const { data, error } = await supabase
        .from('estimates')
        .delete()
        .eq('id', estimateId);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-estimates'] });
      toast({
        title: "Estimate Deleted",
        description: "Estimate has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete estimate. Please try again.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedCustomer({ 
      name: '', 
      email: '', 
      phone: '', 
      address: '', 
      city: '', 
      state: '', 
      zipCode: '' 
    });
    setSelectedMobileHome('');
    setSelectedTemplate('');
    setEstimateNotes('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'sent':
        return <Send className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Group estimates by status
  const draftEstimates = estimates.filter(est => est.status === 'draft');
  const sentEstimates = estimates.filter(est => est.status === 'sent');
  const approvedEstimates = estimates.filter(est => est.status === 'approved');
  const rejectedEstimates = estimates.filter(est => est.status === 'rejected');

  if (estimatesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading estimates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Estimates Management</CardTitle>
              <p className="text-muted-foreground">Create, manage and send estimates with DocuSign integration</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Templates
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Manage DocuSign Templates</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="template-name">Template Name</Label>
                        <Input
                          id="template-name"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Standard Estimate"
                        />
                      </div>
                      <div>
                        <Label htmlFor="template-id">DocuSign Template ID</Label>
                        <Input
                          id="template-id"
                          value={newTemplate.template_id}
                          onChange={(e) => setNewTemplate(prev => ({ ...prev, template_id: e.target.value }))}
                          placeholder="Template ID from DocuSign"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => addTemplateMutation.mutate()} 
                      disabled={!newTemplate.name || !newTemplate.template_id || addTemplateMutation.isPending}
                      className="w-full"
                    >
                      Add Template
                    </Button>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="font-medium">Existing Templates</h4>
                      {docusignTemplates.map((template) => (
                        <div key={template.id} className="flex justify-between items-center p-2 border rounded">
                          <span>{template.name}</span>
                          <Badge variant="outline">{template.template_id}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Estimate
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Estimate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    {/* Customer Information */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Customer Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="customer-name">Customer Name</Label>
                          <Input
                            id="customer-name"
                            value={selectedCustomer.name}
                            onChange={(e) => setSelectedCustomer(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter customer name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customer-email">Email</Label>
                          <Input
                            id="customer-email"
                            type="email"
                            value={selectedCustomer.email}
                            onChange={(e) => setSelectedCustomer(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="customer@email.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customer-phone">Phone</Label>
                          <Input
                            id="customer-phone"
                            value={selectedCustomer.phone}
                            onChange={(e) => setSelectedCustomer(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="delivery-address">Address</Label>
                          <Input
                            id="delivery-address"
                            value={selectedCustomer.address}
                            onChange={(e) => setSelectedCustomer(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Street address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customer-city">City</Label>
                          <Input
                            id="customer-city"
                            value={selectedCustomer.city}
                            onChange={(e) => setSelectedCustomer(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customer-state">State</Label>
                          <Input
                            id="customer-state"
                            value={selectedCustomer.state}
                            onChange={(e) => setSelectedCustomer(prev => ({ ...prev, state: e.target.value }))}
                            placeholder="State"
                          />
                        </div>
                        <div>
                          <Label htmlFor="customer-zip">Zip Code</Label>
                          <Input
                            id="customer-zip"
                            value={selectedCustomer.zipCode}
                            onChange={(e) => setSelectedCustomer(prev => ({ ...prev, zipCode: e.target.value }))}
                            placeholder="Zip Code"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mobile Home Selection */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Mobile Home Selection</h3>
                      <Select value={selectedMobileHome} onValueChange={setSelectedMobileHome}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a mobile home" />
                        </SelectTrigger>
                        <SelectContent>
                          {mobileHomes.map((home) => (
                            <SelectItem key={home.id} value={home.id}>
                              {home.manufacturer} {home.series} {home.model} - ${home.price.toLocaleString()} 
                              ({home.length_feet}' x {home.width_feet}')
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="estimate-notes">Notes (Optional)</Label>
                      <Textarea
                        id="estimate-notes"
                        value={estimateNotes}
                        onChange={(e) => setEstimateNotes(e.target.value)}
                        placeholder="Additional notes for this estimate..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => createEstimateMutation.mutate()}
                        disabled={!selectedCustomer.name || !selectedCustomer.email || !selectedMobileHome || createEstimateMutation.isPending}
                      >
                        Create Estimate
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Estimates Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{draftEstimates.length}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sent</p>
                <p className="text-2xl font-bold">{sentEstimates.length}</p>
              </div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedEstimates.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${estimates.reduce((sum, est) => sum + est.total_amount, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estimates List */}
      <Card>
        <CardHeader>
          <CardTitle>All Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All ({estimates.length})</TabsTrigger>
              <TabsTrigger value="draft">Draft ({draftEstimates.length})</TabsTrigger>
              <TabsTrigger value="sent">Sent ({sentEstimates.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedEstimates.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {estimates.map((estimate) => (
                <div key={estimate.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{estimate.customer_name}</h3>
                        <Badge className={getStatusColor(estimate.status)}>
                          {getStatusIcon(estimate.status)}
                          <span className="ml-1 capitalize">{estimate.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{estimate.customer_email}</p>
                      <p className="text-sm">
                        {estimate.mobile_homes?.manufacturer} {estimate.mobile_homes?.series} {estimate.mobile_homes?.model}
                      </p>
                      <p className="font-medium">${estimate.total_amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {format(new Date(estimate.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {/* Edit Button - available for draft and sent estimates */}
                      {(estimate.status === 'draft' || estimate.status === 'sent') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingEstimate(estimate);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}

                      {/* Approve Button - available for sent estimates */}
                      {estimate.status === 'sent' && (
                        <Button 
                          size="sm"
                          onClick={() => approveEstimateMutation.mutate(estimate.id)}
                          disabled={approveEstimateMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}

                      {/* Deny Button - available for sent estimates */}
                      {estimate.status === 'sent' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => denyEstimateMutation.mutate(estimate.id)}
                          disabled={denyEstimateMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      )}

                      {/* Send Button - available for draft estimates */}
                      {estimate.status === 'draft' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Send Estimate via DocuSign</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Select DocuSign Template</Label>
                                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {docusignTemplates.map((template) => (
                                      <SelectItem key={template.id} value={template.template_id}>
                                        {template.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline">Cancel</Button>
                                <Button 
                                  onClick={() => sendEstimateMutation.mutate({ 
                                    estimateId: estimate.id, 
                                    templateId: selectedTemplate 
                                  })}
                                  disabled={!selectedTemplate || sendEstimateMutation.isPending}
                                >
                                  Send Estimate
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* View Button - always available */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Estimate Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Customer</Label>
                                <p className="font-medium">{estimate.customer_name}</p>
                              </div>
                              <div>
                                <Label>Status</Label>
                                <Badge variant={
                                  estimate.status === 'draft' ? 'secondary' :
                                  estimate.status === 'sent' ? 'default' :
                                  estimate.status === 'approved' ? 'default' :
                                  estimate.status === 'pending_review' ? 'secondary' :
                                  'secondary'
                                }>
                                  {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1).replace('_', ' ')}
                                </Badge>
                              </div>
                              <div>
                                <Label>Email</Label>
                                <p>{estimate.customer_email}</p>
                              </div>
                              <div>
                                <Label>Phone</Label>
                                <p>{estimate.customer_phone}</p>
                              </div>
                              <div className="col-span-2">
                                <Label>Delivery Address</Label>
                                <p>{estimate.delivery_address}</p>
                              </div>
                              <div>
                                <Label>Mobile Home</Label>
                                <p>{estimate.mobile_homes?.manufacturer} {estimate.mobile_homes?.series} {estimate.mobile_homes?.model}</p>
                              </div>
                              <div>
                                <Label>Total Amount</Label>
                                <p className="font-medium text-lg">${estimate.total_amount.toLocaleString()}</p>
                              </div>
                              <div>
                                <Label>Created</Label>
                                <p>{format(new Date(estimate.created_at), 'MMM dd, yyyy HH:mm')}</p>
                              </div>
                              {estimate.approved_at && (
                                <div>
                                  <Label>Approved</Label>
                                  <p>{format(new Date(estimate.approved_at), 'MMM dd, yyyy HH:mm')}</p>
                                </div>
                              )}
                            </div>

                            <EstimateLineItems estimateId={estimate.id} />

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 pt-4 border-t">
                              {/* Edit Button - available for draft and sent estimates */}
                              {(estimate.status === 'draft' || estimate.status === 'sent') && (
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingEstimate(estimate);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              )}

                              {/* Send Button - available for draft estimates */}
                              {estimate.status === 'draft' && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button>
                                      <Send className="h-4 w-4 mr-2" />
                                      Send
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Send Estimate via DocuSign</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Select DocuSign Template</Label>
                                        <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Choose a template" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {docusignTemplates.map((template) => (
                                              <SelectItem key={template.id} value={template.template_id}>
                                                {template.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button variant="outline">Cancel</Button>
                                        <Button 
                                          onClick={() => sendEstimateMutation.mutate({ 
                                            estimateId: estimate.id, 
                                            templateId: selectedTemplate 
                                          })}
                                          disabled={!selectedTemplate || sendEstimateMutation.isPending}
                                        >
                                          Send Estimate
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}

                              {/* Deny Button - available for sent estimates */}
                              {estimate.status === 'sent' && (
                                <Button 
                                  variant="destructive" 
                                  onClick={() => denyEstimateMutation.mutate(estimate.id)}
                                  disabled={denyEstimateMutation.isPending}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Deny
                                </Button>
                              )}

                               {/* Approve Button - available for sent estimates */}
                              {estimate.status === 'sent' && (
                                <Button 
                                  onClick={() => approveEstimateMutation.mutate(estimate.id)}
                                  disabled={approveEstimateMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                              )}

                              {/* Delete Button with confirmation */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the estimate for {estimate.customer_name}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteEstimateMutation.mutate(estimate.id)}
                                      disabled={deleteEstimateMutation.isPending}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Estimate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="draft" className="space-y-4">
              {draftEstimates.map((estimate) => (
                <div key={estimate.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-medium">{estimate.customer_name}</h3>
                      <p className="text-sm text-muted-foreground">{estimate.customer_email}</p>
                      <p className="text-sm">
                        {estimate.mobile_homes?.manufacturer} {estimate.mobile_homes?.series} {estimate.mobile_homes?.model}
                      </p>
                      <p className="font-medium">${estimate.total_amount.toLocaleString()}</p>
                    </div>
                    <Button size="sm">
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="sent" className="space-y-4">
              {sentEstimates.map((estimate) => (
                <div key={estimate.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-medium">{estimate.customer_name}</h3>
                      <p className="text-sm text-muted-foreground">{estimate.customer_email}</p>
                      <p className="text-sm">
                        {estimate.mobile_homes?.manufacturer} {estimate.mobile_homes?.series} {estimate.mobile_homes?.model}
                      </p>
                      <p className="font-medium">${estimate.total_amount.toLocaleString()}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      <Send className="h-4 w-4 mr-1" />
                      Sent
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {approvedEstimates.map((estimate) => (
                <div key={estimate.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h3 className="font-medium">{estimate.customer_name}</h3>
                      <p className="text-sm text-muted-foreground">{estimate.customer_email}</p>
                      <p className="text-sm">
                        {estimate.mobile_homes?.manufacturer} {estimate.mobile_homes?.series} {estimate.mobile_homes?.model}
                      </p>
                      <p className="font-medium">${estimate.total_amount.toLocaleString()}</p>
                      {estimate.approved_at && (
                        <p className="text-xs text-muted-foreground">
                          Approved: {format(new Date(estimate.approved_at), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approved
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Estimate Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Estimate</DialogTitle>
          </DialogHeader>
          {editingEstimate && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="font-medium">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-customer-name">Customer Name</Label>
                    <Input
                      id="edit-customer-name"
                      value={editingEstimate.customer_name}
                      onChange={(e) => setEditingEstimate(prev => prev ? { ...prev, customer_name: e.target.value } : null)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-customer-email">Email</Label>
                    <Input
                      id="edit-customer-email"
                      type="email"
                      value={editingEstimate.customer_email}
                      onChange={(e) => setEditingEstimate(prev => prev ? { ...prev, customer_email: e.target.value } : null)}
                      placeholder="customer@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-customer-phone">Phone</Label>
                    <Input
                      id="edit-customer-phone"
                      value={editingEstimate.customer_phone}
                      onChange={(e) => setEditingEstimate(prev => prev ? { ...prev, customer_phone: e.target.value } : null)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-delivery-address">Delivery Address</Label>
                    <Input
                      id="edit-delivery-address"
                      value={editingEstimate.delivery_address}
                      onChange={(e) => setEditingEstimate(prev => prev ? { ...prev, delivery_address: e.target.value } : null)}
                      placeholder="Street address"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Home Selection */}
              <div className="space-y-4">
                <h3 className="font-medium">Mobile Home Selection</h3>
                <Select 
                  value={editingEstimate.mobile_home_id || ''} 
                  onValueChange={(value) => {
                    const selectedHome = mobileHomes.find(h => h.id === value);
                    setEditingEstimate(prev => prev ? { 
                      ...prev, 
                      mobile_home_id: value,
                      total_amount: selectedHome?.price || prev.total_amount
                    } : null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mobile home" />
                  </SelectTrigger>
                  <SelectContent>
                    {mobileHomes.map((home) => (
                      <SelectItem key={home.id} value={home.id}>
                        {home.manufacturer} {home.series} {home.model} - ${home.price.toLocaleString()} 
                        ({home.length_feet}' x {home.width_feet}')
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Total Amount */}
              <div className="space-y-2">
                <Label htmlFor="edit-total-amount">Total Amount</Label>
                <Input
                  id="edit-total-amount"
                  type="number"
                  value={editingEstimate.total_amount}
                  onChange={(e) => setEditingEstimate(prev => prev ? { ...prev, total_amount: parseFloat(e.target.value) || 0 } : null)}
                  placeholder="Total amount"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => editEstimateMutation.mutate(editingEstimate)}
                  disabled={!editingEstimate.customer_name || !editingEstimate.customer_email || editEstimateMutation.isPending}
                >
                  Update Estimate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};