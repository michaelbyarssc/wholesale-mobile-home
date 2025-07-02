
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Percent, Edit, Plus, Trash2 } from 'lucide-react';

interface CustomerMarkup {
  id: string;
  user_id: string;
  markup_percentage: number;
  created_at: string;
  updated_at: string;
  profile?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export const CustomerMarkupTab = () => {
  const [customerMarkups, setCustomerMarkups] = useState<CustomerMarkup[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMarkup, setEditingMarkup] = useState<CustomerMarkup | null>(null);
  const [newMarkup, setNewMarkup] = useState({ user_id: '', markup_percentage: 0 });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCustomerMarkups();
    fetchAllUsers();
  }, []);

  const fetchCustomerMarkups = async () => {
    try {
      // Fetch customer markups and profiles separately since there's no foreign key
      const { data: markups, error: markupsError } = await supabase
        .from('customer_markups')
        .select('*')
        .order('created_at', { ascending: false });

      if (markupsError) throw markupsError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name');

      if (profilesError) throw profilesError;

      // Match markups with profiles
      const markupsWithProfiles = (markups || []).map(markup => {
        const profile = profiles?.find(p => p.user_id === markup.user_id);
        return {
          ...markup,
          profile: profile ? {
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name
          } : null
        };
      });

      setCustomerMarkups(markupsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching customer markups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch customer markups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .order('email');

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSaveMarkup = async (markup: Partial<CustomerMarkup>) => {
    try {
      if (markup.id) {
        // Update existing markup
        const { error } = await supabase
          .from('customer_markups')
          .update({
            markup_percentage: markup.markup_percentage,
            updated_at: new Date().toISOString()
          })
          .eq('id', markup.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer markup updated successfully",
        });
      } else {
        // Create new markup
        const { error } = await supabase
          .from('customer_markups')
          .insert({
            user_id: newMarkup.user_id,
            markup_percentage: newMarkup.markup_percentage
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Customer markup created successfully",
        });
        setNewMarkup({ user_id: '', markup_percentage: 0 });
        setShowAddDialog(false);
      }

      fetchCustomerMarkups();
      setEditingMarkup(null);
    } catch (error: any) {
      console.error('Error saving markup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save customer markup",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMarkup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer markup?')) return;

    try {
      const { error } = await supabase
        .from('customer_markups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer markup deleted successfully",
      });

      fetchCustomerMarkups();
    } catch (error: any) {
      console.error('Error deleting markup:', error);
      toast({
        title: "Error",
        description: "Failed to delete customer markup",
        variant: "destructive",
      });
    }
  };

  const getDisplayName = (profile: any) => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile?.email || 'Unknown User';
  };

  const getAvailableUsers = () => {
    const existingUserIds = customerMarkups.map(m => m.user_id);
    return allUsers.filter(user => !existingUserIds.includes(user.user_id));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Markups</CardTitle>
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
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Customer Markups
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set individual markup percentages for each customer
              </p>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Markup
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Customer Markup</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="customer">Customer</Label>
                    <select
                      id="customer"
                      value={newMarkup.user_id}
                      onChange={(e) => setNewMarkup(prev => ({ ...prev, user_id: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                      required
                    >
                      <option value="">Select a customer</option>
                      {getAvailableUsers().map(user => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.email} {user.first_name || user.last_name ? `(${user.first_name || ''} ${user.last_name || ''})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="markup">Markup Percentage</Label>
                    <Input
                      id="markup"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newMarkup.markup_percentage}
                      onChange={(e) => setNewMarkup(prev => ({ ...prev, markup_percentage: parseFloat(e.target.value) || 0 }))}
                      placeholder="e.g., 25 for 25%"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleSaveMarkup(newMarkup)}
                      disabled={!newMarkup.user_id}
                    >
                      Add Markup
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Markup %</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerMarkups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No customer markups configured
                    </TableCell>
                  </TableRow>
                ) : (
                  customerMarkups.map((markup) => (
                    <TableRow key={markup.id}>
                      <TableCell className="font-medium">
                        {getDisplayName(markup.profile)}
                      </TableCell>
                      <TableCell>{markup.profile?.email || 'No email'}</TableCell>
                      <TableCell>
                        {editingMarkup?.id === markup.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingMarkup.markup_percentage}
                            onChange={(e) => setEditingMarkup(prev => prev ? { ...prev, markup_percentage: parseFloat(e.target.value) || 0 } : null)}
                            className="w-20"
                          />
                        ) : (
                          <Badge variant="outline">
                            {markup.markup_percentage}%
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(markup.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {editingMarkup?.id === markup.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSaveMarkup(editingMarkup)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMarkup(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMarkup(markup)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteMarkup(markup.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
