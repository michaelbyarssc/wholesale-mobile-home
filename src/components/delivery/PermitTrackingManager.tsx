import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Plus, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PermitTrackingManagerProps {
  deliveryId: string;
}

interface DeliveryPermit {
  id: string;
  permit_type: string;
  permit_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  status: string;
  document_url: string;
  cost: number;
  notes: string;
}

interface NewPermit {
  permit_type: string;
  permit_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string;
  cost: number;
  notes: string;
}

export const PermitTrackingManager: React.FC<PermitTrackingManagerProps> = ({ deliveryId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingPermit, setIsAddingPermit] = useState(false);
  const [newPermit, setNewPermit] = useState<NewPermit>({
    permit_type: '',
    permit_number: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    cost: 0,
    notes: ''
  });

  const { data: permits, isLoading } = useQuery({
    queryKey: ['delivery-permits', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_permits')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeliveryPermit[];
    },
  });

  const addPermitMutation = useMutation({
    mutationFn: async (permitData: NewPermit) => {
      const { data, error } = await supabase
        .from('delivery_permits')
        .insert({
          delivery_id: deliveryId,
          ...permitData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Permit Added",
        description: "Delivery permit has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['delivery-permits', deliveryId] });
      setIsAddingPermit(false);
      setNewPermit({
        permit_type: '',
        permit_number: '',
        issuing_authority: '',
        issue_date: '',
        expiry_date: '',
        cost: 0,
        notes: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Permit",
        description: error.message || "Failed to add permit",
        variant: "destructive",
      });
    },
  });

  const updatePermitStatusMutation = useMutation({
    mutationFn: async ({ permitId, status }: { permitId: string; status: string }) => {
      const { data, error } = await supabase
        .from('delivery_permits')
        .update({ status })
        .eq('id', permitId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Permit Updated",
        description: "Permit status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['delivery-permits', deliveryId] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update permit",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'expired':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry >= new Date();
  };

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const handleAddPermit = () => {
    addPermitMutation.mutate(newPermit);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Permit Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Permit Tracking
        </CardTitle>
        <CardDescription>
          Manage delivery permits and track expiration dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">
            Permits ({permits?.length || 0})
          </h4>
          <Dialog open={isAddingPermit} onOpenChange={setIsAddingPermit}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Permit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Permit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Permit Type</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newPermit.permit_type}
                    onChange={(e) => setNewPermit({ ...newPermit, permit_type: e.target.value })}
                  >
                    <option value="">Select permit type</option>
                    <option value="transport">Transport Permit</option>
                    <option value="oversize">Oversize Load Permit</option>
                    <option value="route">Route Permit</option>
                    <option value="weight">Weight Permit</option>
                    <option value="special">Special Hauling Permit</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Permit Number</Label>
                  <Input
                    value={newPermit.permit_number}
                    onChange={(e) => setNewPermit({ ...newPermit, permit_number: e.target.value })}
                    placeholder="Enter permit number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Issuing Authority</Label>
                  <Input
                    value={newPermit.issuing_authority}
                    onChange={(e) => setNewPermit({ ...newPermit, issuing_authority: e.target.value })}
                    placeholder="e.g., State DOT"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={newPermit.issue_date}
                      onChange={(e) => setNewPermit({ ...newPermit, issue_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={newPermit.expiry_date}
                      onChange={(e) => setNewPermit({ ...newPermit, expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cost</Label>
                  <Input
                    type="number"
                    value={newPermit.cost}
                    onChange={(e) => setNewPermit({ ...newPermit, cost: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={newPermit.notes}
                    onChange={(e) => setNewPermit({ ...newPermit, notes: e.target.value })}
                    placeholder="Additional notes"
                  />
                </div>

                <Button 
                  onClick={handleAddPermit}
                  disabled={addPermitMutation.isPending || !newPermit.permit_type || !newPermit.permit_number}
                  className="w-full"
                >
                  {addPermitMutation.isPending ? 'Adding...' : 'Add Permit'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!permits || permits.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No permits found. Add permits to track them.
          </div>
        ) : (
          <div className="space-y-3">
            {permits.map((permit) => (
              <div key={permit.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{permit.permit_type.replace('_', ' ')}</span>
                    <Badge variant={getStatusColor(permit.status)}>
                      {permit.status}
                    </Badge>
                    {isExpired(permit.expiry_date) && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expired
                      </Badge>
                    )}
                    {isExpiringSoon(permit.expiry_date) && !isExpired(permit.expiry_date) && (
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expires Soon
                      </Badge>
                    )}
                  </div>
                  {permit.document_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={permit.document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Number:</span> {permit.permit_number}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Authority:</span> {permit.issuing_authority}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-muted-foreground">Issue:</span> {new Date(permit.issue_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-muted-foreground">Expires:</span> {new Date(permit.expiry_date).toLocaleDateString()}
                  </div>
                </div>

                {permit.cost > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Cost:</span> ${permit.cost.toFixed(2)}
                  </div>
                )}

                {permit.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Notes:</span> {permit.notes}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updatePermitStatusMutation.mutate({
                      permitId: permit.id,
                      status: permit.status === 'active' ? 'cancelled' : 'active'
                    })}
                    disabled={updatePermitStatusMutation.isPending}
                  >
                    {permit.status === 'active' ? 'Cancel' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};