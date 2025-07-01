
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
          <Label htmlFor="customer-name">Full Name *</Label>
          <Input
            id="customer-name"
            name="customer-name"
            value={customerInfo.name}
            onChange={(e) => updateCustomerInfo('name', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="customer-phone">Phone Number *</Label>
          <Input
            id="customer-phone"
            name="customer-phone"
            type="tel"
            value={customerInfo.phone}
            onChange={(e) => updateCustomerInfo('phone', e.target.value)}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="customer-email">Email Address *</Label>
          <Input
            id="customer-email"
            name="customer-email"
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
              <Label htmlFor="customer-address">Street Address</Label>
              <Input
                id="customer-address"
                name="customer-address"
                value={customerInfo.address}
                onChange={(e) => updateCustomerInfo('address', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label htmlFor="customer-city">City</Label>
              <Input
                id="customer-city"
                name="customer-city"
                value={customerInfo.city}
                onChange={(e) => updateCustomerInfo('city', e.target.value)}
                placeholder="Spartanburg"
              />
            </div>
            <div>
              <Label htmlFor="customer-state">State</Label>
              <Select value={customerInfo.state} onValueChange={(value) => updateCustomerInfo('state', value)}>
                <SelectTrigger id="customer-state" name="customer-state">
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
              <Label htmlFor="customer-zipcode">ZIP Code</Label>
              <Input
                id="customer-zipcode"
                name="customer-zipcode"
                value={customerInfo.zipCode}
                onChange={(e) => updateCustomerInfo('zipCode', e.target.value)}
                placeholder="29301"
                maxLength={5}
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="customer-contact">Preferred Contact Method</Label>
          <Select value={customerInfo.preferredContact} onValueChange={(value) => updateCustomerInfo('preferredContact', value)}>
            <SelectTrigger id="customer-contact" name="customer-contact">
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
          <Label htmlFor="customer-timeline">Installation Timeline</Label>
          <Select value={customerInfo.timeline} onValueChange={(value) => updateCustomerInfo('timeline', value)}>
            <SelectTrigger id="customer-timeline" name="customer-timeline">
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
          <Label htmlFor="customer-requirements">Additional Requirements</Label>
          <Textarea
            id="customer-requirements"
            name="customer-requirements"
            value={customerInfo.requirements}
            onChange={(e) => updateCustomerInfo('requirements', e.target.value)}
            placeholder="Any special requirements or questions?"
          />
        </div>
      </CardContent>
    </Card>
  );
};
