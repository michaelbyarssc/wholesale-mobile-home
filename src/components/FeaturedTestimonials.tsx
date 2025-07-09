import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Testimonial = Tables<"testimonials">;

interface FeaturedTestimonialsProps {
  variant?: "carousel" | "grid" | "compact";
  className?: string;
  limit?: number;
}

export const FeaturedTestimonials = ({ 
  variant = "carousel", 
  className = "",
  limit = 6 
}: FeaturedTestimonialsProps) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data } = await supabase
          .from("testimonials")
          .select("*")
          .eq("approved", true)
          .eq("featured", true)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (data) {
          setTestimonials(data);
        }
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      }
    };

    fetchTestimonials();
  }, [limit]);

  useEffect(() => {
    if (testimonials.length > 1 && isAutoPlaying && variant === "carousel") {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [testimonials.length, isAutoPlaying, variant]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (!testimonials.length) {
    return null;
  }

  if (variant === "compact") {
    const testimonial = testimonials[currentIndex];
    return (
      <Card className={`bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Quote className="w-8 h-8 text-primary/40 flex-shrink-0 mt-1" />
            <div>
              <p className="text-gray-700 italic mb-4 line-clamp-3">
                "{testimonial.content}"
              </p>
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {testimonial.customer_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{testimonial.customer_name}</p>
                  {testimonial.customer_location && (
                    <p className="text-xs text-muted-foreground">{testimonial.customer_location}</p>
                  )}
                </div>
                <div className="flex ml-auto">
                  {renderStars(testimonial.rating)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "grid") {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {testimonials.slice(0, 6).map((testimonial) => (
          <Card key={testimonial.id} className="h-full">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex mb-4">
                {renderStars(testimonial.rating)}
              </div>
              
              <blockquote className="text-gray-700 mb-4 flex-1">
                "{testimonial.content}"
              </blockquote>
              
              <div className="flex items-center gap-3 mt-auto">
                <Avatar>
                  <AvatarFallback>
                    {testimonial.customer_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{testimonial.customer_name}</p>
                  {testimonial.customer_location && (
                    <p className="text-sm text-muted-foreground">{testimonial.customer_location}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Carousel variant
  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className={`relative ${className}`}>
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-8 lg:p-12">
          <div className="text-center max-w-4xl mx-auto">
            <Quote className="w-12 h-12 text-primary/40 mx-auto mb-6" />
            
            <div className="flex justify-center mb-6">
              {renderStars(currentTestimonial.rating)}
            </div>
            
            <blockquote className="text-xl lg:text-2xl text-gray-700 font-medium leading-relaxed mb-8">
              "{currentTestimonial.content}"
            </blockquote>
            
            <div className="flex items-center justify-center gap-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="text-lg">
                  {currentTestimonial.customer_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="font-semibold text-lg">{currentTestimonial.customer_name}</p>
                {currentTestimonial.customer_location && (
                  <p className="text-muted-foreground">{currentTestimonial.customer_location}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      {testimonials.length > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={prevTestimonial}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-primary' : 'bg-gray-300'
                }`}
                onMouseEnter={() => setIsAutoPlaying(false)}
                onMouseLeave={() => setIsAutoPlaying(true)}
              />
            ))}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={nextTestimonial}
            onMouseEnter={() => setIsAutoPlaying(false)}
            onMouseLeave={() => setIsAutoPlaying(true)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};