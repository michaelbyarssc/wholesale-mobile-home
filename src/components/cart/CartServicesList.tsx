
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils';
import { CartItem } from '@/components/ShoppingCart';

interface CartServicesListProps {
  item: CartItem;
  services: any[];
  availableServices: any[];
  getServicePrice: (serviceId: string) => number;
  getMissingDependencies: (serviceId: string) => string[];
  getServicesByDependency: (serviceId: string) => any[];
  onUpdateServices: (homeId: string, selectedServices: string[]) => void;
  calculatePrice: (cost: number) => number;
}

export const CartServicesList = ({
  item,
  services,
  availableServices,
  getServicePrice,
  getMissingDependencies,
  getServicesByDependency,
  onUpdateServices,
  calculatePrice
}: CartServicesListProps) => {
  console.log(`CartServicesList - Home: ${item.mobileHome.model}, Width: ${item.mobileHome.width_feet}ft`);
  console.log(`CartServicesList - Available services:`, services.length);
  console.log(`CartServicesList - Selected services:`, item.selectedServices);
  console.log(`CartServicesList - Available services after filtering:`, availableServices.length);

  const handleServiceToggle = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (item.selectedServices.includes(serviceId)) {
      // Removing service - check if other services depend on it
      const dependentServices = getServicesByDependency(serviceId);
      const selectedDependentServices = dependentServices.filter(s => 
        item.selectedServices.includes(s.id)
      );

      if (selectedDependentServices.length > 0) {
        alert(`Cannot remove service. This service is required by: ${selectedDependentServices.map(s => s.name).join(', ')}`);
        return;
      }

      onUpdateServices(item.mobileHome.id, item.selectedServices.filter(id => id !== serviceId));
    } else {
      // Adding service - check dependencies
      const missingDeps = getMissingDependencies(serviceId);
      if (missingDeps.length > 0) {
        const missingServiceNames = missingDeps.map(depId => 
          services.find(s => s.id === depId)?.name
        ).filter(Boolean);

        alert(`Please select these services first: ${missingServiceNames.join(', ')}`);
        return;
      }

      onUpdateServices(item.mobileHome.id, [...item.selectedServices, serviceId]);
    }
  };

  return (
    <div>
      <h4 className="font-medium mb-3">Available Services:</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableServices.map((service) => {
          const isSelected = item.selectedServices.includes(service.id);
          // Get the raw service cost from conditional pricing
          const serviceCost = getServicePrice(service.id);
          console.log(`Cart - Service ${service.name}: Raw cost from getServicePrice = ${serviceCost}`);
          
          // Apply customer markup to the cost
          const displayPrice = calculatePrice(serviceCost);
          console.log(`Cart - Service ${service.name}: After markup = ${displayPrice}`);
          
          return (
            <div key={service.id} className="flex items-start space-x-3 p-2 border rounded">
              <Checkbox
                id={`${item.mobileHome.id}-${service.id}`}
                checked={isSelected}
                onCheckedChange={() => handleServiceToggle(service.id)}
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`${item.mobileHome.id}-${service.id}`}
                  className="font-medium cursor-pointer text-sm"
                >
                  {service.name}
                </Label>
                {service.description && (
                  <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                )}
                
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(displayPrice)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
