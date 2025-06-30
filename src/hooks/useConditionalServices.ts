import { useMemo } from 'react';
import type { Database } from '@/integrations/supabase/types';

type Service = Database['public']['Tables']['services']['Row'];
type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

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
      if (service.applicable_manufacturers && Array.isArray(service.applicable_manufacturers) && service.applicable_manufacturers.length > 0) {
        if (!service.applicable_manufacturers.includes(selectedMobileHome.manufacturer)) {
          return false;
        }
      }

      // Check if service applies to selected series
      if (service.applicable_series && Array.isArray(service.applicable_series) && service.applicable_series.length > 0) {
        if (!service.applicable_series.includes(selectedMobileHome.series)) {
          return false;
        }
      }

      // Check dependencies
      if (service.dependencies && Array.isArray(service.dependencies) && service.dependencies.length > 0) {
        const hasAllDependencies = service.dependencies.every(depId => 
          selectedServices.includes(depId as string)
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
      console.log(`getServicePrice called for serviceId: ${serviceId}`);
      const service = services.find(s => s.id === serviceId);
      const selectedMobileHome = mobileHomes.find(home => home.id === selectedHome);
      
      console.log(`Found service: ${service?.name}, Found home: ${selectedMobileHome?.model}`);
      
      if (!service || !selectedMobileHome) {
        console.log(`Service price calculation failed: service=${!!service}, home=${!!selectedMobileHome}`);
        return 0;
      }

      // Special logging for Vinyl Skirting
      if (service.name && service.name.toLowerCase().includes('vinyl skirting')) {
        console.log(`VINYL SKIRTING DEBUG:`);
        console.log(`- Service ID: ${service.id}`);
        console.log(`- Service name: ${service.name}`);
        console.log(`- Base price: ${service.price}`);
        console.log(`- Single wide price: ${service.single_wide_price}`);
        console.log(`- Double wide price: ${service.double_wide_price}`);
        console.log(`- Cost: ${service.cost}`);
        console.log(`- All service data:`, service);
      }

      // Determine if it's a single wide or double wide based on WIDTH (not length)
      const homeWidth = selectedMobileHome.width_feet || 0;
      const isDoubleWide = homeWidth > 16;

      console.log(`Service ${service.name}: Home width = ${homeWidth}ft, isDoubleWide = ${isDoubleWide}`);
      console.log(`Service pricing - single_wide_price: ${service.single_wide_price}, double_wide_price: ${service.double_wide_price}, base_price: ${service.price}`);

      // Use the appropriate pricing based on home width
      let price = 0;
      if (isDoubleWide) {
        // For double wide: use double_wide_price if it exists and is > 0, otherwise fall back to base price
        price = (service.double_wide_price && service.double_wide_price > 0) ? service.double_wide_price : (service.price || 0);
      } else {
        // For single wide: use single_wide_price if it exists and is > 0, otherwise fall back to base price
        price = (service.single_wide_price && service.single_wide_price > 0) ? service.single_wide_price : (service.price || 0);
      }

      console.log(`Service ${service.name} final calculated price: ${price}`);
      
      // Extra logging for vinyl skirting
      if (service.name && service.name.toLowerCase().includes('vinyl skirting')) {
        console.log(`VINYL SKIRTING FINAL PRICE: ${price}`);
      }
      
      return price;
    };
  }, [services, selectedHome, mobileHomes]);

  const getDependencies = useMemo(() => {
    return (serviceId: string) => {
      const service = services.find(s => s.id === serviceId);
      if (!service?.dependencies || !Array.isArray(service.dependencies)) return [];
      return service.dependencies as string[];
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
        service.dependencies && 
        Array.isArray(service.dependencies) && 
        service.dependencies.includes(dependencyId)
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
