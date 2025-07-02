
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Percent, Settings, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CustomerMarkupTab } from './CustomerMarkupTab';

interface SuperAdminMarkup {
  id: string;
  user_id: string;
  markup_percentage: number;
  created_at: string;
  updated_at: string;
}

export const SuperAdminMarkupTab = () => {
  const [markupPercentage, setMarkupPercentage] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Fetch current super admin markup
  const { data: superAdminMarkup, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-markup'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('super_admin_markups')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (superAdminMarkup) {
      setMarkupPercentage(superAdminMarkup.markup_percentage);
    }
  }, [superAdminMarkup]);

  const handleSaveMarkup = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      if (superAdminMarkup) {
        // Update existing markup
        const { error } = await supabase
          .from('super_admin_markups')
          .update({
            markup_percentage: markupPercentage,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new markup
        const { error } = await supabase
          .from('super_admin_markups')
          .insert({
            user_id: user.id,
            markup_percentage: markupPercentage
          });

        if (error) throw error;
      }

      // Also update all customer markups with the new super admin markup
      const { error: updateError } = await supabase
        .from('customer_markups')
        .update({
          super_admin_markup_percentage: markupPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('tier_level', 'admin'); // Update all admin tier markups

      if (updateError) {
        console.warn('Failed to update cascading markups:', updateError);
      }

      toast({
        title: "Success",
        description: `Super admin markup updated to ${markupPercentage}%`,
      });

      refetch();
    } catch (error: any) {
      console.error('Error saving super admin markup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save super admin markup",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Super Admin Markup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <div>
              <CardTitle>Super Admin Markup Configuration</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your markup percentage that applies to all admin-level pricing
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="markup-percentage" className="text-base font-medium">
                  Super Admin Markup Percentage
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="markup-percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <Percent className="h-4 w-4 text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  This markup applies on top of base costs before admin markups
                </p>
              </div>
              
              <Button 
                onClick={handleSaveMarkup}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Markup"}
              </Button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Pricing Structure</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Cost:</span>
                  <span className="font-mono">$1,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Super Admin ({markupPercentage}%):</span>
                  <span className="font-mono">+${(1000 * markupPercentage / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Admin sees:</span>
                  <span className="font-mono font-medium">${(1000 * (1 + markupPercentage / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Admin Markup (30%):</span>
                  <span className="font-mono">+${(1000 * (1 + markupPercentage / 100) * 0.30).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span className="text-gray-900">Customer pays:</span>
                  <span className="font-mono">${(1000 * (1 + markupPercentage / 100) * 1.30).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <div>
              <CardTitle>Admin User Markup Management</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage markup percentages for individual admin users
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CustomerMarkupTab />
        </CardContent>
      </Card>
    </div>
  );
};
