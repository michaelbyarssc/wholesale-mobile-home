
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ServicesCardProps {
  services: any[];
}

export const ServicesCard = ({ services }: ServicesCardProps) => {
  if (services.length === 0) return null;

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader className="bg-amber-50 border-b">
        <CardTitle className="text-amber-900">Additional Services</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0">
              <div>
                <p className="font-medium text-gray-900">{service.name}</p>
                {service.description && (
                  <p className="text-sm text-gray-600">{service.description}</p>
                )}
              </div>
              <span className="text-lg font-semibold text-gray-900">${service.price?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
