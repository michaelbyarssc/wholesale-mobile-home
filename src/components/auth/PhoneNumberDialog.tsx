
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PhoneNumberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPhoneAdded: () => void;
}

export const PhoneNumberDialog = ({ isOpen, onClose, onPhoneAdded }: PhoneNumberDialogProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Phone Number Added",
        description: "Your phone number has been successfully added to your profile.",
      });

      onPhoneAdded();
      onClose();
    } catch (error: any) {
      console.error('Error updating phone number:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update phone number",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Phone Number</DialogTitle>
          <DialogDescription>
            Please add your phone number to complete your profile. This helps us provide better customer service.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(555) 123-4567"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Skip for now
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Phone Number"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
