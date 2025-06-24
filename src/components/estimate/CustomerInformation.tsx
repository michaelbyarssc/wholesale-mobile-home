
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  preferredContact: string;
  timeline: string;
  requirements: string;
}

interface CustomerInformationProps {
  customerInfo: CustomerInfo;
  onCustomerInfoChange: (info: CustomerInfo) => void;
}

export const CustomerInformation = ({ customerInfo, onCustomerInfoChange }: CustomerInformationProps) => {
  const updateCustomerInfo = (field: keyof CustomerInfo, value: string) => {
    onCustomerInfoChange({ ...customerInfo, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-900">Your Information</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={customerInfo.name}
            onChange={(e) => updateCustomerInfo('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => updateCustomerInfo('phone', e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={customerInfo.email}
            onChange={(e) => updateCustomerInfo('email', e.target.value)}
            required
          />
        </div>
        
        {/* Delivery Address Section */}
        <div className="md:col-span-2">
          <h3 className="font-medium text-gray-900 mb-3">Delivery Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={customerInfo.address}
                onChange={(e) => updateCustomerInfo('address', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={customerInfo.city}
                onChange={(e) => updateCustomerInfo('city', e.target.value)}
                placeholder="Spartanburg"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Select value={customerInfo.state} onValueChange={(value) => updateCustomerInfo('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AL">Alabama</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="GA">Georgia</SelectItem>
                  <SelectItem value="NC">North Carolina</SelectItem>
                  <SelectItem value="SC">South Carolina</SelectItem>
                  <SelectItem value="TN">Tennessee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={customerInfo.zipCode}
                onChange={(e) => updateCustomerInfo('zipCode', e.target.value)}
                placeholder="29301"
                maxLength={5}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="contact">Preferred Contact Method</Label>
          <Select value={customerInfo.preferredContact} onValueChange={(value) => updateCustomerInfo('preferredContact', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select contact method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phone">Phone</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="text">Text Message</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="timeline">Installation Timeline</Label>
          <Select value={customerInfo.timeline} onValueChange={(value) => updateCustomerInfo('timeline', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select timeline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asap">As soon as possible</SelectItem>
              <SelectItem value="1-2months">1-2 months</SelectItem>
              <SelectItem value="3-6months">3-6 months</SelectItem>
              <SelectItem value="6+months">6+ months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="requirements">Additional Requirements</Label>
          <Textarea
            id="requirements"
            value={customerInfo.requirements}
            onChange={(e) => updateCustomerInfo('requirements', e.target.value)}
            placeholder="Any special requirements or questions?"
          />
        </div>
      </CardContent>
    </Card>
  );
};
