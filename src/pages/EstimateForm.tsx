
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  price: number;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
}

const EstimateForm = () => {
  const { toast } = useToast();
  
  // Mobile home options - you can modify these prices later in the admin
  const mobileHomes: MobileHome[] = [
    { id: '1', manufacturer: 'Clayton', series: 'Tru', model: 'Tru MH 16x80', price: 75000 },
    { id: '2', manufacturer: 'Clayton', series: 'Tru', model: 'Tru MH 18x80', price: 85000 },
    { id: '3', manufacturer: 'Clayton', series: 'Tru', model: 'Tru MH 20x80', price: 95000 },
    { id: '4', manufacturer: 'Clayton', series: 'Epic', model: 'Epic MH 16x80', price: 95000 },
    { id: '5', manufacturer: 'Clayton', series: 'Epic', model: 'Epic MH 18x80', price: 105000 },
    { id: '6', manufacturer: 'Clayton', series: 'Epic', model: 'Epic MH 20x80', price: 115000 },
  ];

  // Services - you can modify these in the admin
  const services: Service[] = [
    { id: '1', name: 'Delivery and Setup', price: 5000 },
    { id: '2', name: 'Site Preparation', price: 3500 },
    { id: '3', name: 'Electrical Hookup', price: 1500 },
    { id: '4', name: 'Plumbing Connections', price: 2000 },
    { id: '5', name: 'Brick Skirting Installation', price: 4500 },
    { id: '6', name: 'Vinyl Skirting Installation', price: 2500 },
    { id: '7', name: 'Steps/Decks', price: 3000 },
  ];

  const [selectedHome, setSelectedHome] = useState<string>('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    preferredContact: '',
    timeline: '',
    requirements: ''
  });

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const calculateTotal = () => {
    const homePrice = selectedHome ? mobileHomes.find(h => h.id === selectedHome)?.price || 0 : 0;
    const servicesPrice = selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      return total + (service?.price || 0);
    }, 0);
    return homePrice + servicesPrice;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHome || !customerInfo.name || !customerInfo.phone || !customerInfo.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select a mobile home.",
        variant: "destructive",
      });
      return;
    }

    // Here you would typically send the data to your backend
    // For now, we'll show a success message
    toast({
      title: "Estimate Submitted!",
      description: "We'll send your estimate via email and text shortly.",
    });
    
    console.log('Estimate Data:', {
      selectedHome: mobileHomes.find(h => h.id === selectedHome),
      selectedServices: selectedServices.map(id => services.find(s => s.id === id)),
      customerInfo,
      total: calculateTotal()
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Wholesale Homes of the Carolinas
          </h1>
          <p className="text-lg text-green-700">Get Your Mobile Home Estimate</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Mobile Home Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Select Your Mobile Home</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mobileHomes.map((home) => (
                  <div
                    key={home.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedHome === home.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedHome(home.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{home.manufacturer} {home.series}</h3>
                        <p className="text-gray-600">{home.model}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${home.price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Services Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-blue-900">Additional Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={service.id}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => handleServiceToggle(service.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={service.id} className="font-medium cursor-pointer">
                        {service.name}
                      </Label>
                      <p className="text-sm text-gray-600">
                        ${service.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
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
                  onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Delivery Address</Label>
                <Textarea
                  id="address"
                  value={customerInfo.address}
                  onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                  placeholder="Enter the full delivery address"
                />
              </div>
              <div>
                <Label htmlFor="contact">Preferred Contact Method</Label>
                <Select value={customerInfo.preferredContact} onValueChange={(value) => setCustomerInfo({...customerInfo, preferredContact: value})}>
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
                <Select value={customerInfo.timeline} onValueChange={(value) => setCustomerInfo({...customerInfo, timeline: value})}>
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
                  onChange={(e) => setCustomerInfo({...customerInfo, requirements: e.target.value})}
                  placeholder="Any special requirements or questions?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Total and Submit */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-blue-900">Total Estimate:</h3>
                  <p className="text-sm text-gray-600">*Final pricing may vary based on site conditions</p>
                </div>
                <div className="text-4xl font-bold text-green-600">
                  ${calculateTotal().toLocaleString()}
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                Get My Estimate
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Business Contact Info */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">Questions? Contact us:</p>
          <p>Phone: (555) 123-4567 | Email: info@wholesalehomescarolinas.com</p>
        </div>
      </div>
    </div>
  );
};

export default EstimateForm;
