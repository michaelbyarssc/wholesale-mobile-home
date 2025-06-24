
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost?: number;
  dependencies?: string[];
  applicable_manufacturers?: string[];
  applicable_series?: string[];
  requires_admin?: boolean;
  conditional_pricing?: any;
}

interface ServicesSelectionProps {
  selectedHome: string;
  availableServices: Service[];
  selectedServices: string[];
  services: Service[];
  onServiceToggle: (serviceId: string) => void;
  calculatePrice: (cost: number) => number;
  getDependencies: (serviceId: string) => string[];
  getMissingDependencies: (serviceId: string) => string[];
}

export const ServicesSelection = ({
  selectedHome,
  availableServices,
  selectedServices,
  services,
  onServiceToggle,
  calculatePrice,
  getDependencies,
  getMissingDependencies
}: ServicesSelectionProps) => {
  const isServiceDisabled = (service: Service) => {
    const missingDeps = getMissingDependencies(service.id);
    return missingDeps.length > 0;
  };

  const getServiceStatusBadges = (service: Service) => {
    const badges = [];
    
    if (service.requires_admin) {
      badges.push(<Badge key="admin" variant="outline" className="text-xs">Admin Required</Badge>);
    }
    
    const dependencies = getDependencies(service.id);
    if (dependencies.length > 0) {
      const depNames = dependencies.map(depId => 
        services.find(s => s.id === depId)?.name
      ).filter(Boolean);
      badges.push(
        <Badge key="deps" variant="outline" className="text-xs">
          Requires: {depNames.join(', ')}
        </Badge>
      );
    }

    return badges;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-900">Additional Services</CardTitle>
        {selectedHome && (
          <p className="text-sm text-gray-600">
            Services available for your selected mobile home
          </p>
        )}
      </CardHeader>
      <CardContent>
        {!selectedHome ? (
          <p className="text-gray-500 text-center py-4">
            Please select a mobile home first to see available services
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableServices.map((service) => {
              const isDisabled = isServiceDisabled(service);
              const serviceCost = service.cost || service.price;
              const displayPrice = calculatePrice(serviceCost);
              
              return (
                <div 
                  key={service.id} 
                  className={`p-3 border rounded-lg ${
                    isDisabled ? 'opacity-50 bg-gray-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id={service.id}
                      checked={selectedServices.includes(service.id)}
                      onCheckedChange={() => onServiceToggle(service.id)}
                      disabled={isDisabled}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={service.id} 
                        className={`font-medium cursor-pointer ${
                          isDisabled ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {service.name}
                      </Label>
                      {service.description && (
                        <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        ${displayPrice.toLocaleString()}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getServiceStatusBadges(service)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
