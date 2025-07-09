import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StarRating } from "./StarRating";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const reviewSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  content: z.string().min(10, "Review must be at least 10 characters").max(1000, "Review must be less than 1000 characters"),
  rating: z.number().min(1, "Rating is required").max(5)
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  mobileHomeId: string;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id: string;
    title: string;
    content: string;
    rating: number;
  };
}

export const ReviewForm = ({ mobileHomeId, userId, onSuccess, onCancel, initialData }: ReviewFormProps) => {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      title: initialData?.title || "",
      content: initialData?.content || "",
      rating: initialData?.rating || 0
    }
  });

  const onSubmit = async (data: ReviewFormData) => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating from 1 to 5 stars.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewData = {
        title: data.title,
        content: data.content,
        rating,
        mobile_home_id: mobileHomeId,
        user_id: userId
      };

      if (initialData) {
        // Update existing review
        const { error } = await supabase
          .from("reviews")
          .update({
            title: data.title,
            content: data.content,
            rating
          })
          .eq("id", initialData.id);

        if (error) throw error;

        toast({
          title: "Review Updated",
          description: "Your review has been updated successfully."
        });
      } else {
        // Create new review
        const { error } = await supabase
          .from("reviews")
          .insert(reviewData);

        if (error) throw error;

        toast({
          title: "Review Submitted",
          description: "Thank you for your review! It will be visible shortly."
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Review" : "Write a Review"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <FormLabel>Rating *</FormLabel>
              <div className="mt-2">
                <StarRating 
                  rating={rating} 
                  onRatingChange={setRating}
                  size="lg"
                />
              </div>
              {rating === 0 && form.formState.isSubmitted && (
                <p className="text-sm text-destructive mt-1">Rating is required</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Title *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Summarize your experience..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell others about your experience with this mobile home..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : initialData ? "Update Review" : "Submit Review"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};