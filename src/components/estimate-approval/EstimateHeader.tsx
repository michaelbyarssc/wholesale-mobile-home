
import React from 'react';
import { Building2, Phone, Mail, MapPin } from 'lucide-react';

interface EstimateHeaderProps {
  estimateNumber: string;
  currentDate: string;
}

export const EstimateHeader = ({ estimateNumber, currentDate }: EstimateHeaderProps) => {
  return (
    <div className="bg-white shadow-lg rounded-lg mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white p-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-8 w-8" />
              <h1 className="text-3xl font-bold">Wholesale Mobile Home</h1>
            </div>
            <p className="text-blue-100 text-lg">Premium Mobile Home Solutions</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">ESTIMATE</p>
            <p className="text-blue-100">#{estimateNumber}</p>
            <p className="text-blue-100">{currentDate}</p>
          </div>
        </div>
      </div>
      
      <div className="p-6 bg-gray-50 border-b">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">(555) 123-4567</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">Info@WholesaleMobileHome.com</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700">Charlotte, NC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
