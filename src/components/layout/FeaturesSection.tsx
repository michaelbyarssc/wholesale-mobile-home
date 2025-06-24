
import React from 'react';
import { CheckCircle, Shield, Users, Zap } from 'lucide-react';

export const FeaturesSection = () => {
  const features = [
    {
      icon: <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />,
      title: "Professional Estimates",
      description: "Get accurate, detailed estimates for your mobile home needs with our professional assessment process."
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
    <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <h3 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Why Choose Our Services?
          </h3>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            We provide comprehensive mobile home services with a focus on quality, 
            reliability, and customer satisfaction.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center p-4 sm:p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex justify-center mb-3 sm:mb-4">
                {feature.icon}
              </div>
              <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
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
