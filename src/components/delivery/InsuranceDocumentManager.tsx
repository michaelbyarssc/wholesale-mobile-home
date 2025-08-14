import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Plus, Calendar, AlertTriangle, ExternalLink, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InsuranceDocumentManagerProps {
  deliveryId: string;
}

interface DeliveryInsurance {
  id: string;
  policy_number: string;
  insurance_provider: string;
  coverage_type: string;
  coverage_amount: number;
  effective_date: string;
  expiry_date: string;
  premium_amount: number;
  document_url: string;
  status: string;
}

interface NewInsurance {
  policy_number: string;
  insurance_provider: string;
  coverage_type: string;
  coverage_amount: number;
  effective_date: string;
  expiry_date: string;
  premium_amount: number;
}

export const InsuranceDocumentManager: React.FC<InsuranceDocumentManagerProps> = ({ deliveryId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddingInsurance, setIsAddingInsurance] = useState(false);
  const [newInsurance, setNewInsurance] = useState<NewInsurance>({
    policy_number: '',
    insurance_provider: '',
    coverage_type: '',
    coverage_amount: 0,
    effective_date: '',
    expiry_date: '',
    premium_amount: 0
  });

  const { data: insurancePolicies, isLoading } = useQuery({
    queryKey: ['delivery-insurance', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_insurance')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeliveryInsurance[];
    },
  });

  const addInsuranceMutation = useMutation({
    mutationFn: async (insuranceData: NewInsurance) => {
      const { data, error } = await supabase
        .from('delivery_insurance')
        .insert({
          delivery_id: deliveryId,
          ...insuranceData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Insurance Added",
        description: "Insurance policy has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['delivery-insurance', deliveryId] });
      setIsAddingInsurance(false);
      setNewInsurance({
        policy_number: '',
        insurance_provider: '',
        coverage_type: '',
        coverage_amount: 0,
        effective_date: '',
        expiry_date: '',
        premium_amount: 0
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Insurance",
        description: error.message || "Failed to add insurance policy",
        variant: "destructive",
      });
    },
  });

  const updateInsuranceStatusMutation = useMutation({
    mutationFn: async ({ insuranceId, status }: { insuranceId: string; status: string }) => {
      const { data, error } = await supabase
        .from('delivery_insurance')
        .update({ status })
        .eq('id', insuranceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Insurance Updated",
        description: "Insurance status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['delivery-insurance', deliveryId] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update insurance",
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

  const getCoverageTypeColor = (coverageType: string) => {
    switch (coverageType.toLowerCase()) {
      case 'liability':
        return 'default';
      case 'comprehensive':
        return 'secondary';
      case 'cargo':
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleAddInsurance = () => {
    addInsuranceMutation.mutate(newInsurance);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Insurance Management
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
          <Shield className="h-5 w-5" />
          Insurance Management
        </CardTitle>
        <CardDescription>
          Manage insurance policies and track coverage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">
            Policies ({insurancePolicies?.length || 0})
          </h4>
          <Dialog open={isAddingInsurance} onOpenChange={setIsAddingInsurance}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Insurance Policy</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Policy Number</Label>
                  <Input
                    value={newInsurance.policy_number}
                    onChange={(e) => setNewInsurance({ ...newInsurance, policy_number: e.target.value })}
                    placeholder="Enter policy number"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Insurance Provider</Label>
                  <Input
                    value={newInsurance.insurance_provider}
                    onChange={(e) => setNewInsurance({ ...newInsurance, insurance_provider: e.target.value })}
                    placeholder="e.g., State Farm, Allstate"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Coverage Type</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={newInsurance.coverage_type}
                    onChange={(e) => setNewInsurance({ ...newInsurance, coverage_type: e.target.value })}
                  >
                    <option value="">Select coverage type</option>
                    <option value="liability">Liability</option>
                    <option value="comprehensive">Comprehensive</option>
                    <option value="cargo">Cargo</option>
                    <option value="motor_truck_cargo">Motor Truck Cargo</option>
                    <option value="general_liability">General Liability</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Coverage Amount</Label>
                  <Input
                    type="number"
                    value={newInsurance.coverage_amount}
                    onChange={(e) => setNewInsurance({ ...newInsurance, coverage_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Effective Date</Label>
                    <Input
                      type="date"
                      value={newInsurance.effective_date}
                      onChange={(e) => setNewInsurance({ ...newInsurance, effective_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={newInsurance.expiry_date}
                      onChange={(e) => setNewInsurance({ ...newInsurance, expiry_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Premium Amount</Label>
                  <Input
                    type="number"
                    value={newInsurance.premium_amount}
                    onChange={(e) => setNewInsurance({ ...newInsurance, premium_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <Button 
                  onClick={handleAddInsurance}
                  disabled={addInsuranceMutation.isPending || !newInsurance.policy_number || !newInsurance.insurance_provider}
                  className="w-full"
                >
                  {addInsuranceMutation.isPending ? 'Adding...' : 'Add Policy'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!insurancePolicies || insurancePolicies.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No insurance policies found. Add policies to track coverage.
          </div>
        ) : (
          <div className="space-y-3">
            {insurancePolicies.map((policy) => (
              <div key={policy.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{policy.insurance_provider}</span>
                    <Badge variant={getCoverageTypeColor(policy.coverage_type)}>
                      {policy.coverage_type.replace('_', ' ')}
                    </Badge>
                    <Badge variant={getStatusColor(policy.status)}>
                      {policy.status}
                    </Badge>
                    {isExpired(policy.expiry_date) && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expired
                      </Badge>
                    )}
                    {isExpiringSoon(policy.expiry_date) && !isExpired(policy.expiry_date) && (
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Expires Soon
                      </Badge>
                    )}
                  </div>
                  {policy.document_url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={policy.document_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Policy:</span> {policy.policy_number}
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-muted-foreground">Coverage:</span> {formatCurrency(policy.coverage_amount)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-muted-foreground">Effective:</span> {new Date(policy.effective_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-muted-foreground">Expires:</span> {new Date(policy.expiry_date).toLocaleDateString()}
                  </div>
                </div>

                {policy.premium_amount > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <DollarSign className="h-3 w-3" />
                    <span className="text-muted-foreground">Premium:</span> {formatCurrency(policy.premium_amount)}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateInsuranceStatusMutation.mutate({
                      insuranceId: policy.id,
                      status: policy.status === 'active' ? 'cancelled' : 'active'
                    })}
                    disabled={updateInsuranceStatusMutation.isPending}
                  >
                    {policy.status === 'active' ? 'Cancel' : 'Activate'}
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