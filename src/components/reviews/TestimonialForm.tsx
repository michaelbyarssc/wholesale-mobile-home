import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const testimonialSchema = z.object({
  customerName: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  location: z.string().min(1, "Location is required").max(100, "Location must be less than 100 characters"),
  content: z.string().min(10, "Testimonial must be at least 10 characters").max(1000, "Testimonial must be less than 1000 characters"),
  rating: z.number().min(1, "Rating is required").max(5)
});

type TestimonialFormData = z.infer<typeof testimonialSchema>;

interface TestimonialFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const TestimonialForm = ({ onSuccess, onCancel }: TestimonialFormProps) => {
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialSchema),
    defaultValues: {
      customerName: "",
      location: "",
      content: "",
      rating: 0
    }
  });

  const onSubmit = async (data: TestimonialFormData) => {
    console.log('🔄 Form submitted with data:', data);
    console.log('⭐ Rating:', rating);
    
    if (rating === 0) {
      console.log('❌ No rating selected');
      toast({
        title: "Rating Required",
        description: "Please select a rating from 1 to 5 stars.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    console.log('⏳ Starting testimonial submission...');

    try {
      const insertData = {
        customer_name: data.customerName,
        customer_location: data.location,
        content: data.content,
        rating: rating,
        approved: false // Testimonials need admin approval
      };
      
      console.log('📝 Inserting testimonial with data:', insertData);

      const { data: result, error } = await supabase
        .from('testimonials')
        .insert(insertData)
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log('✅ Testimonial inserted successfully:', result);

      // Clear the testimonials cache so fresh data loads
      if (typeof window !== 'undefined') {
        const testimonialsCache = (window as any).testimonialsCache;
        if (testimonialsCache) {
          (window as any).testimonialsCache = null;
          console.log('🗑️ Cleared testimonials cache');
        }
      }

      toast({
        title: "Thank you!",
        description: "Your testimonial has been submitted and will be reviewed by our team.",
      });

      form.reset();
      setRating(0);
      onSuccess?.();
      console.log('🎉 Form reset and success callback called');
    } catch (error) {
      console.error('💥 Error submitting testimonial:', error);
      toast({
        title: "Error",
        description: "Failed to submit testimonial. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Form submission completed');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Share Your Experience</CardTitle>
        <p className="text-muted-foreground">
          Tell others about your experience with us. Your testimonial will be reviewed before being published.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John Doe" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="City, State" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Rating *</label>
              <div className="mt-2">
              <StarRating
                rating={rating}
                onRatingChange={(newRating) => {
                  setRating(newRating);
                  form.setValue('rating', newRating);
                }}
                size="lg"
              />
              </div>
              {rating === 0 && form.formState.isSubmitted && (
                <p className="text-sm text-destructive mt-1">Rating is required</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Testimonial *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Share your experience with our mobile homes and service..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              {onCancel && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="flex-1"
                onClick={() => {
                  console.log('🔘 Submit button clicked');
                  console.log('📊 Form state:', form.formState);
                  console.log('🌟 Current rating:', rating);
                  console.log('📝 Form values:', form.getValues());
                  console.log('❌ Form errors:', form.formState.errors);
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Testimonial"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};