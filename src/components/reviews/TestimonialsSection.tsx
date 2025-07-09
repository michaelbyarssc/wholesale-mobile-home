import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "./StarRating";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface Testimonial {
  id: string;
  customer_name: string;
  customer_location?: string;
  content: string;
  rating: number;
  image_url?: string;
  featured: boolean;
}

export const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data, error } = await supabase
          .from("testimonials")
          .select("*")
          .eq("approved", true)
          .order("featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(6);

        if (error) throw error;
        setTestimonials(data || []);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Customer Testimonials</h2>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Customer Testimonials</h2>
          <p className="text-lg text-gray-600">
            See what our satisfied customers have to say about their mobile home experience
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent>
            {testimonials.map((testimonial) => (
              <CarouselItem key={testimonial.id} className="md:basis-1/2 lg:basis-1/3">
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <StarRating rating={testimonial.rating} readonly size="sm" />
                    </div>
                    
                    <blockquote className="text-gray-700 mb-4 italic">
                      "{testimonial.content}"
                    </blockquote>
                    
                    <div className="flex items-center gap-3">
                      {testimonial.image_url && (
                        <img
                          src={testimonial.image_url}
                          alt={testimonial.customer_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">
                          {testimonial.customer_name}
                        </div>
                        {testimonial.customer_location && (
                          <div className="text-sm text-gray-500">
                            {testimonial.customer_location}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
};