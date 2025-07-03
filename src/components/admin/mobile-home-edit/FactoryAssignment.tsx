import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Factory, Plus, Trash2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Factory = Database['public']['Tables']['factories']['Row'];
type MobileHomeFactory = Database['public']['Tables']['mobile_home_factories']['Row'];

interface FactoryAssignmentProps {
  mobileHomeId: string;
}

export const FactoryAssignment = ({ mobileHomeId }: FactoryAssignmentProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('30');

  // Fetch all factories
  const { data: factories = [] } = useQuery({
    queryKey: ['factories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Factory[];
    }
  });

  // Fetch assigned factories for this mobile home
  const { data: assignedFactories = [], refetch } = useQuery({
    queryKey: ['mobile-home-factories', mobileHomeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_home_factories')
        .select(`
          *,
          factories (*)
        `)
        .eq('mobile_home_id', mobileHomeId);
      
      if (error) throw error;
      return data;
    }
  });

  // Add factory assignment mutation
  const addFactoryAssignment = useMutation({
    mutationFn: async () => {
      if (!selectedFactoryId) {
        throw new Error('Please select a factory');
      }

      const { error } = await supabase
        .from('mobile_home_factories')
        .insert({
          mobile_home_id: mobileHomeId,
          factory_id: selectedFactoryId,
          production_lead_time_days: parseInt(leadTimeDays) || 30
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-home-factories', mobileHomeId] });
      setSelectedFactoryId('');
      setLeadTimeDays('30');
      toast({
        title: "Success",
        description: "Factory assigned successfully"
      });
    },
    onError: (error: any) => {
      const message = error.message?.includes('duplicate') 
        ? 'This factory is already assigned to this mobile home'
        : `Failed to assign factory: ${error.message}`;
      
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  });

  // Remove factory assignment mutation
  const removeFactoryAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('mobile_home_factories')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-home-factories', mobileHomeId] });
      toast({
        title: "Success",
        description: "Factory assignment removed successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove factory assignment: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Update lead time mutation
  const updateLeadTime = useMutation({
    mutationFn: async ({ assignmentId, leadTime }: { assignmentId: string, leadTime: number }) => {
      const { error } = await supabase
        .from('mobile_home_factories')
        .update({ production_lead_time_days: leadTime })
        .eq('id', assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-home-factories', mobileHomeId] });
      toast({
        title: "Success",
        description: "Lead time updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update lead time: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const availableFactories = factories.filter(
    factory => !assignedFactories.some(af => af.factory_id === factory.id)
  );

  const handleAddFactory = () => {
    addFactoryAssignment.mutate();
  };

  const handleRemoveFactory = (assignmentId: string) => {
    removeFactoryAssignment.mutate(assignmentId);
  };

  const handleLeadTimeChange = (assignmentId: string, newLeadTime: string) => {
    const leadTimeNumber = parseInt(newLeadTime);
    if (leadTimeNumber > 0) {
      updateLeadTime.mutate({ assignmentId, leadTime: leadTimeNumber });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5" />
          Factory Assignments
          {assignedFactories.length === 0 && (
            <Badge variant="destructive" className="ml-2">Required</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Assignments */}
        {assignedFactories.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Assigned Factories:</div>
            {assignedFactories.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{assignment.factories?.name}</div>
                  <div className="text-sm text-gray-600">
                    {assignment.factories?.city}, {assignment.factories?.state}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <Input
                      type="number"
                      value={assignment.production_lead_time_days}
                      onChange={(e) => handleLeadTimeChange(assignment.id, e.target.value)}
                      className="w-20 h-6 text-xs"
                      min="1"
                    />
                    <span className="text-xs text-gray-500">days lead time</span>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Factory Assignment</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove "{assignment.factories?.name}" from this mobile home?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleRemoveFactory(assignment.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-lg">
            <Factory className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm font-medium">No factories assigned</p>
            <p className="text-xs">You must assign at least one factory to save this mobile home</p>
          </div>
        )}

        {/* Add New Factory */}
        {availableFactories.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Add Factory:</div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="factory-select">Select Factory</Label>
                <Select value={selectedFactoryId} onValueChange={setSelectedFactoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a factory..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFactories.map((factory) => (
                      <SelectItem key={factory.id} value={factory.id}>
                        <div>
                          <div className="font-medium">{factory.name}</div>
                          <div className="text-xs text-gray-600">
                            {factory.city}, {factory.state}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="lead-time">Production Lead Time (days)</Label>
                <Input
                  id="lead-time"
                  type="number"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  placeholder="30"
                  min="1"
                />
              </div>
              
              <Button 
                onClick={handleAddFactory}
                disabled={!selectedFactoryId || addFactoryAssignment.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {addFactoryAssignment.isPending ? 'Adding...' : 'Add Factory'}
              </Button>
            </div>
          </div>
        )}

        {availableFactories.length === 0 && assignedFactories.length > 0 && (
          <div className="text-center py-2 text-sm text-gray-500">
            All available factories have been assigned
          </div>
        )}

        {factories.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">No factories available.</p>
            <p className="text-xs">Create factories in the Factories tab first.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};