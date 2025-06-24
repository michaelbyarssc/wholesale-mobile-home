
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  price: number;
  cost: number;
}

interface MobileHomeSelectionProps {
  mobileHomes: MobileHome[];
  selectedHome: string;
  onSelectHome: (homeId: string) => void;
  calculatePrice: (cost: number) => number;
}

export const MobileHomeSelection = ({ 
  mobileHomes, 
  selectedHome, 
  onSelectHome, 
  calculatePrice 
}: MobileHomeSelectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-blue-900">Select Your Mobile Home</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mobileHomes.map((home) => {
            const displayPrice = calculatePrice(home.cost || home.price);
            return (
              <div
                key={home.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedHome === home.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => onSelectHome(home.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-lg">{home.manufacturer} {home.series}</h3>
                    <p className="text-gray-600">{home.model}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${displayPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
