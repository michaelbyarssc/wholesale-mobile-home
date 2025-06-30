
import React from 'react';
import { CheckCircle, Shield, Users, Zap } from 'lucide-react';

export const FeaturesSection = () => {
  const features = [
    {
      icon: <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />,
      title: "Price Match Guarantee",
      description: "We guarantee the absolute best deal on any of our homes. Find a better price elsewhere and we'll match it - that's our promise to you."
    },
    {
      icon: <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />,
      title: "Trusted Service",
      description: "Years of experience in the mobile home industry with a proven track record of satisfied customers."
    },
    {
      icon: <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />,
      title: "Expert Team",
      description: "Our certified professionals provide personalized service tailored to your specific requirements."
    },
    {
      icon: <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />,
      title: "Quick Process",
      description: "Streamlined estimation process that saves you time while ensuring accuracy and completeness."
    }
  ];

  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
            Why choose us over the competition?
          </h3>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
            We are a one-stop shop when it comes to all of your mobile home needs!
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-6 sm:p-8 lg:p-6 rounded-xl hover:shadow-xl transition-all duration-300 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200">
              <div className="flex justify-center mb-4 sm:mb-6">
                {feature.icon}
              </div>
              <h4 className="text-lg sm:text-xl lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                {feature.title}
              </h4>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
