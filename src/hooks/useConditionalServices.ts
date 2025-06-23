
import { useMemo } from 'react';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  dependencies?: string[];
  applicable_manufacturers?: string[];
  applicable_series?: string[];
  requires_admin?: boolean;
  conditional_pricing?: any;
}

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
}

export const useConditionalServices = (
  services: Service[],
  selectedHome: string | null,
  mobileHomes: MobileHome[],
  selectedServices: string[]
) => {
  const availableServices = useMemo(() => {
    if (!selectedHome) return [];

    const selectedMobileHome = mobileHomes.find(home => home.id === selectedHome);
    if (!selectedMobileHome) return [];

    return services.filter(service => {
      // Check if service applies to selected manufacturer
      if (service.applicable_manufacturers && service.applicable_manufacturers.length > 0) {
        if (!service.applicable_manufacturers.includes(selectedMobileHome.manufacturer)) {
          return false;
        }
      }

      // Check if service applies to selected series
      if (service.applicable_series && service.applicable_series.length > 0) {
        if (!service.applicable_series.includes(selectedMobileHome.series)) {
          return false;
        }
      }

      // Check dependencies
      if (service.dependencies && service.dependencies.length > 0) {
        const hasAllDependencies = service.dependencies.every(depId => 
          selectedServices.includes(depId)
        );
        if (!hasAllDependencies) {
          return false;
        }
      }

      return true;
    });
  }, [services, selectedHome, mobileHomes, selectedServices]);

  const getServicePrice = useMemo(() => {
    return (serviceId: string) => {
      const service = services.find(s => s.id === serviceId);
      if (!service) return 0;

      // For now, return base price. Could implement conditional pricing logic here
      return service.price;
    };
  }, [services]);

  const getDependencies = useMemo(() => {
    return (serviceId: string) => {
      const service = services.find(s => s.id === serviceId);
      return service?.dependencies || [];
    };
  }, [services]);

  const getMissingDependencies = useMemo(() => {
    return (serviceId: string) => {
      const dependencies = getDependencies(serviceId);
      return dependencies.filter(depId => !selectedServices.includes(depId));
    };
  }, [getDependencies, selectedServices]);

  const getServicesByDependency = useMemo(() => {
    return (dependencyId: string) => {
      return services.filter(service => 
        service.dependencies?.includes(dependencyId)
      );
    };
  }, [services]);

  return {
    availableServices,
    getServicePrice,
    getDependencies,
    getMissingDependencies,
    getServicesByDependency
  };
};
