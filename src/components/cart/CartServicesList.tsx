
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useConditionalServices } from '@/hooks/useConditionalServices';
import { formatPrice } from '@/lib/utils';
import { CartItem } from '@/components/ShoppingCart';

interface CartServicesListProps {
  item: CartItem;
  services: any[];
  onUpdateServices: (homeId: string, selectedServices: string[]) => void;
  calculatePrice: (cost: number) => number;
}

export const CartServicesList = ({
  item,
  services,
  onUpdateServices,
  calculatePrice
}: CartServicesListProps) => {
  const mobileHomes = [item.mobileHome];
  
  console.log(`CartServicesList - Home: ${item.mobileHome.model}, Width: ${item.mobileHome.width_feet}ft`);
  
  const {
    availableServices,
    getServicePrice,
    getMissingDependencies,
    getServicesByDependency
  } = useConditionalServices(services, item.mobileHome.id, mobileHomes, item.selectedServices);

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
          
          const homeWidth = item.mobileHome.width_feet || 0;
          const isDoubleWide = homeWidth > 16;
          
          // Debug info for vinyl skirting specifically
          const isVinylSkirting = service.name && service.name.toLowerCase().includes('vinyl') && service.name.toLowerCase().includes('skirting');
          
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
                
                {/* Temporary debugging info - visible in UI */}
                {isVinylSkirting && (
                  <div className="mt-2 p-2 bg-yellow-100 border rounded text-xs">
                    <strong>DEBUG INFO:</strong><br/>
                    Single Wide Price: {service.single_wide_price} (type: {typeof service.single_wide_price})<br/>
                    Double Wide Price: {service.double_wide_price} (type: {typeof service.double_wide_price})<br/>
                    Base Price: {service.price} (type: {typeof service.price})<br/>
                    Home Width: {homeWidth}ft ({isDoubleWide ? 'Double' : 'Single'} Wide)<br/>
                    Raw Service Cost: {serviceCost}<br/>
                    Final Display Price: {displayPrice}
                  </div>
                )}
                
                <p className="text-sm text-gray-600 mt-1">
                  {formatPrice(displayPrice)}
                  <span className="text-xs text-gray-400 ml-1">
                    ({isDoubleWide ? 'Double' : 'Single'} Wide)
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
