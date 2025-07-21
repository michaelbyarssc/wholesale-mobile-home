import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customerInfo: CustomerInfo) => void;
  isLoading?: boolean;
}

export const CustomerInfoModal = ({ isOpen, onClose, onSubmit, isLoading = false }: CustomerInfoModalProps) => {
  const { toast } = useToast();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!customerInfo.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name.",
        variant: "destructive",
      });
      return;
    }
    
    if (!customerInfo.email.trim()) {
      toast({
        title: "Email Required", 
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (!customerInfo.phone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerInfo.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(customerInfo);
  };

  const updateField = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Contact Information</DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Please provide your contact information so we can send you the estimate and follow up with any questions.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer-name">Full Name *</Label>
            <Input
              id="customer-name"
              value={customerInfo.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="John Doe"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="customer-email">Email Address *</Label>
            <Input
              id="customer-email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="john@email.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="customer-phone">Phone Number *</Label>
            <Input
              id="customer-phone"
              type="tel"
              value={customerInfo.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(555) 123-4567"
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Sending...' : 'Send Estimate'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};