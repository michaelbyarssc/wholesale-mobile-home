
import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

export const Footer = () => {
  const { data: businessInfo } = useBusinessInfo();

  return (
    <footer className="bg-blue-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">
              {businessInfo?.business_name || 'Wholesale Homes of the Carolinas'}
            </h3>
            <p className="text-blue-100 mb-4">
              Your trusted partner for quality mobile homes in North and South Carolina. 
              We provide affordable housing solutions with exceptional service.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Information</h4>
            <div className="space-y-3">
              {businessInfo?.business_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-300" />
                  <span className="text-blue-100">{businessInfo.business_phone}</span>
                </div>
              )}
              {businessInfo?.business_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-300" />
                  <span className="text-blue-100">{businessInfo.business_email}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-300" />
                <span className="text-blue-100">Serving North & South Carolina</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#mobile-homes" className="text-blue-100 hover:text-white transition-colors">
                  Mobile Homes
                </a>
              </li>
              <li>
                <a href="#features" className="text-blue-100 hover:text-white transition-colors">
                  Services
                </a>
              </li>
              <li>
                <a href="#contact" className="text-blue-100 hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-blue-800 mt-8 pt-8 text-center">
          <p className="text-blue-200">
            © 2025 {businessInfo?.business_name || 'Wholesale Homes of the Carolinas'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
