
import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';

export const Footer = () => {
  const { data: businessInfo } = useBusinessInfo();

  return (
    <footer className="bg-blue-900 text-white py-12 sm:py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">
              {businessInfo?.business_name || 'Wholesale Mobile Home'}
            </h3>
            <p className="text-blue-100 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
              Your trusted partner for quality mobile homes in the Southeast. 
              We provide affordable housing solutions with exceptional service.
            </p>
          </div>
          
          <div>
            <h4 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Contact Information</h4>
            <div className="space-y-3 sm:space-y-4">
              {businessInfo?.business_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300 flex-shrink-0" />
                  <a 
                    href={`tel:${businessInfo.business_phone}`}
                    className="text-blue-100 hover:text-white transition-colors text-sm sm:text-base"
                  >
                    {businessInfo.business_phone}
                  </a>
                </div>
              )}
              {businessInfo?.business_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-300 flex-shrink-0" />
                  <a 
                    href={`mailto:${businessInfo.business_email}`}
                    className="text-blue-100 hover:text-white transition-colors text-sm sm:text-base break-all"
                  >
                    {businessInfo.business_email}
                  </a>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Quick Links</h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <a 
                  href="#mobile-homes" 
                  className="text-blue-100 hover:text-white transition-colors text-sm sm:text-base block py-1"
                >
                  Mobile Homes
                </a>
              </li>
              <li>
                <a 
                  href="#features" 
                  className="text-blue-100 hover:text-white transition-colors text-sm sm:text-base block py-1"
                >
                  Services
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-blue-100 hover:text-white transition-colors text-sm sm:text-base block py-1"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-blue-800 mt-8 sm:mt-12 lg:mt-16 pt-6 sm:pt-8 text-center">
          <p className="text-blue-200 text-sm sm:text-base">
            © 2025 {businessInfo?.business_name || 'Wholesale Mobile Home'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
