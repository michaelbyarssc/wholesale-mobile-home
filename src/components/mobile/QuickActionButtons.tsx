import React from 'react';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MessageSquare, MapPin, Clock } from 'lucide-react';

export const QuickActionButtons = () => {
  return (
    <div className="lg:hidden bg-white border-b border-gray-100 py-3">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {/* Call Now */}
          <Button
            onClick={() => window.location.href = 'tel:864-680-4030'}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-2 touch-manipulation min-w-fit"
            size="sm"
          >
            <Phone className="h-4 w-4" />
            Call Now
          </Button>

          {/* Email */}
          <Button
            onClick={() => window.location.href = 'mailto:Info@WholesaleMobileHome.com'}
            variant="outline"
            className="border-blue-200 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-2 touch-manipulation min-w-fit"
            size="sm"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>

          {/* Live Chat */}
          <Button
            onClick={() => document.dispatchEvent(new CustomEvent('openChat'))}
            variant="outline"
            className="border-purple-200 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-2 touch-manipulation min-w-fit"
            size="sm"
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Button>

          {/* Get Quote */}
          <Button
            onClick={() => {
              const element = document.getElementById('mobile-homes');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            variant="outline"
            className="border-orange-200 text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-2 touch-manipulation min-w-fit"
            size="sm"
          >
            <Clock className="h-4 w-4" />
            Get Quote
          </Button>

          {/* Location */}
          <Button
            onClick={() => window.open('https://maps.google.com?q=mobile+home+dealer+near+me', '_blank')}
            variant="outline"
            className="border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-full font-medium whitespace-nowrap flex items-center gap-2 touch-manipulation min-w-fit"
            size="sm"
          >
            <MapPin className="h-4 w-4" />
            Location
          </Button>
        </div>
      </div>
    </div>
  );
};