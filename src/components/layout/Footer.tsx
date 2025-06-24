
import React from 'react';

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-10 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h4 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
            Wholesale Homes of the Carolinas
          </h4>
          <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
            Professional mobile home services you can trust
          </p>
          <div className="border-t border-gray-800 pt-4 sm:pt-6">
            <p className="text-gray-500 text-xs sm:text-sm">
              © 2024 Wholesale Homes of the Carolinas. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
