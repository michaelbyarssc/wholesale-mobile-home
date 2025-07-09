import React from 'react';
import { NewsletterSignup } from '@/components/NewsletterSignup';

export const NewsletterCTASection = () => {
  return (
    <section className="py-16 bg-gradient-to-br from-primary/10 to-primary/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
            Never Miss New Inventory
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Be the first to know when we receive new mobile homes. Get alerts about fresh inventory, 
            price drops, and exclusive deals delivered straight to your inbox.
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <NewsletterSignup
            title="Get Instant Notifications"
            description="Join thousands of customers who trust us to keep them updated on the best mobile home deals"
          />
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚚</span>
            </div>
            <h3 className="font-semibold text-gray-900">New Arrivals First</h3>
            <p className="text-gray-600 text-sm">Get notified as soon as new homes arrive at our lot</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-semibold text-gray-900">Exclusive Deals</h3>
            <p className="text-gray-600 text-sm">Access to subscriber-only discounts and promotions</p>
          </div>
          
          <div className="space-y-2">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="font-semibold text-gray-900">Market Insights</h3>
            <p className="text-gray-600 text-sm">Stay informed about mobile home trends and pricing</p>
          </div>
        </div>
      </div>
    </section>
  );
};