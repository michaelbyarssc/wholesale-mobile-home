import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/reviews/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Check, X, Eye, Star } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Review {
  id: string;
  title: string;
  content: string;
  rating: number;
  helpful_votes: number;
  verified_purchase: boolean;
  created_at: string;
  mobile_homes: {
    model: string;
    manufacturer: string;
  };
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface Testimonial {
  id: string;
  customer_name: string;
  customer_location: string | null;
  content: string;
  rating: number;
  image_url: string | null;
  featured: boolean;
  approved: boolean;
  created_at: string;
}

export const ReviewsTab = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [newTestimonial, setNewTestimonial] = useState({
    customer_name: "",
    customer_location: "",
    content: "",
    rating: 5,
    featured: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          mobile_homes (
            model,
            manufacturer
          ),
          profiles (
            first_name,
            last_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const reviewsData = (data || []).map(item => ({
        ...item,
        profiles: item.profiles && typeof item.profiles === 'object' && !Array.isArray(item.profiles) 
          ? item.profiles as { first_name: string | null; last_name: string | null; email: string | null }
          : null
      }));
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive"
      });
    }
  };

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      toast({
        title: "Error",
        description: "Failed to fetch testimonials",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchTestimonials();
  }, []);

  const deleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review deleted successfully"
      });

      fetchReviews();
    } catch (error) {
      console.error("Error deleting review:", error);
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive"
      });
    }
  };

  const toggleTestimonialApproval = async (testimonialId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ approved: !currentStatus })
        .eq("id", testimonialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Testimonial ${!currentStatus ? "approved" : "unapproved"} successfully`
      });

      fetchTestimonials();
    } catch (error) {
      console.error("Error updating testimonial:", error);
      toast({
        title: "Error",
        description: "Failed to update testimonial",
        variant: "destructive"
      });
    }
  };

  const toggleTestimonialFeatured = async (testimonialId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ featured: !currentStatus })
        .eq("id", testimonialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Testimonial ${!currentStatus ? "featured" : "unfeatured"} successfully`
      });

      fetchTestimonials();
    } catch (error) {
      console.error("Error updating testimonial:", error);
      toast({
        title: "Error",
        description: "Failed to update testimonial",
        variant: "destructive"
      });
    }
  };

  const deleteTestimonial = async (testimonialId: string) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", testimonialId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Testimonial deleted successfully"
      });

      fetchTestimonials();
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      toast({
        title: "Error",
        description: "Failed to delete testimonial",
        variant: "destructive"
      });
    }
  };

  const createTestimonial = async () => {
    if (!newTestimonial.customer_name || !newTestimonial.content) {
      toast({
        title: "Error",
        description: "Customer name and content are required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("testimonials")
        .insert({
          ...newTestimonial,
          approved: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Testimonial created successfully"
      });

      setNewTestimonial({
        customer_name: "",
        customer_location: "",
        content: "",
        rating: 5,
        featured: false
      });

      fetchTestimonials();
    } catch (error) {
      console.error("Error creating testimonial:", error);
      toast({
        title: "Error",
        description: "Failed to create testimonial",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reviews & Testimonials</h2>
      </div>

      <Tabs defaultValue="reviews" className="w-full">
        <TabsList>
          <TabsTrigger value="reviews">Customer Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials ({testimonials.length})</TabsTrigger>
          <TabsTrigger value="create">Create Testimonial</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-4">
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{review.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={review.rating} readonly size="sm" />
                        <span className="text-sm text-muted-foreground">
                          {formatDate(review.created_at)}
                        </span>
                        {review.verified_purchase && (
                          <Badge variant="secondary">Verified Purchase</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        By {review.profiles?.first_name || "Anonymous"} {review.profiles?.last_name || ""} 
                        {review.profiles?.email && ` (${review.profiles.email})`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        For: {review.mobile_homes?.manufacturer} {review.mobile_homes?.model}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Review</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this review? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteReview(review.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-3">{review.content}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{review.helpful_votes} helpful votes</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <div className="grid gap-4">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{testimonial.customer_name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={testimonial.rating} readonly size="sm" />
                        <span className="text-sm text-muted-foreground">
                          {formatDate(testimonial.created_at)}
                        </span>
                        {testimonial.approved && <Badge variant="default">Approved</Badge>}
                        {testimonial.featured && <Badge variant="secondary">Featured</Badge>}
                      </div>
                      {testimonial.customer_location && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {testimonial.customer_location}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={testimonial.approved ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleTestimonialApproval(testimonial.id, testimonial.approved)}
                      >
                        {testimonial.approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant={testimonial.featured ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleTestimonialFeatured(testimonial.id, testimonial.featured)}
                      >
                        <Star className={`h-4 w-4 ${testimonial.featured ? "fill-current" : ""}`} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Testimonial</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this testimonial? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteTestimonial(testimonial.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">{testimonial.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Testimonial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Customer Name *</label>
                  <Input
                    value={newTestimonial.customer_name}
                    onChange={(e) => setNewTestimonial(prev => ({ ...prev, customer_name: e.target.value }))}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <Input
                    value={newTestimonial.customer_location}
                    onChange={(e) => setNewTestimonial(prev => ({ ...prev, customer_location: e.target.value }))}
                    placeholder="City, State"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Rating *</label>
                <div className="mt-2">
                  <StarRating 
                    rating={newTestimonial.rating} 
                    onRatingChange={(rating) => setNewTestimonial(prev => ({ ...prev, rating }))}
                    size="lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Testimonial Content *</label>
                <Textarea
                  value={newTestimonial.content}
                  onChange={(e) => setNewTestimonial(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter the customer's testimonial..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={newTestimonial.featured}
                  onChange={(e) => setNewTestimonial(prev => ({ ...prev, featured: e.target.checked }))}
                />
                <label htmlFor="featured" className="text-sm font-medium">
                  Feature this testimonial
                </label>
              </div>

              <Button 
                onClick={createTestimonial}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Creating..." : "Create Testimonial"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};