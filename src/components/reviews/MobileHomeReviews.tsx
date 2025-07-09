import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";
import { StarRating } from "./StarRating";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  title: string;
  content: string;
  rating: number;
  helpful_votes: number;
  verified_purchase: boolean;
  created_at: string;
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

interface MobileHomeReviewsProps {
  mobileHomeId: string;
  currentUserId?: string;
}

export const MobileHomeReviews = ({ mobileHomeId, currentUserId }: MobileHomeReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: {}
  });
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest" | "helpful">("newest");
  const { toast } = useToast();

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          *,
          profiles (
            first_name,
            last_name
          )
        `)
        .eq("mobile_home_id", mobileHomeId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reviewsData = (data || []).map(item => ({
        ...item,
        profiles: item.profiles && typeof item.profiles === 'object' && !Array.isArray(item.profiles) 
          ? item.profiles as { first_name: string | null; last_name: string | null }
          : null
      }));

      setReviews(reviewsData);
      calculateStats(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    if (reviewsData.length === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {}
      });
      return;
    }

    const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviewsData.length;

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviewsData.forEach(review => {
      distribution[review.rating]++;
    });

    setStats({
      averageRating,
      totalReviews: reviewsData.length,
      ratingDistribution: distribution
    });
  };

  const sortReviews = (reviewsData: Review[]) => {
    const sorted = [...reviewsData];
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case "highest":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "lowest":
        return sorted.sort((a, b) => a.rating - b.rating);
      case "helpful":
        return sorted.sort((a, b) => b.helpful_votes - a.helpful_votes);
      default:
        return sorted;
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      toast({
        title: "Review Deleted",
        description: "Your review has been deleted successfully."
      });

      fetchReviews();
    } catch (error) {
      console.error("Error deleting review:", error);
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingReview(null);
    fetchReviews();
  };

  useEffect(() => {
    fetchReviews();
  }, [mobileHomeId]);

  const sortedReviews = sortReviews(reviews);

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Customer Reviews
            {currentUserId && !showForm && !editingReview && (
              <Button onClick={() => setShowForm(true)}>
                Write a Review
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.totalReviews > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</div>
                  <div>
                    <StarRating rating={Math.round(stats.averageRating)} readonly />
                    <div className="text-sm text-muted-foreground">
                      Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="text-sm w-3">{rating}</span>
                    <Progress 
                      value={(stats.ratingDistribution[rating] / stats.totalReviews) * 100} 
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-8">
                      {stats.ratingDistribution[rating]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No reviews yet. Be the first to review this home!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Form */}
      {(showForm || editingReview) && currentUserId && (
        <ReviewForm
          mobileHomeId={mobileHomeId}
          userId={currentUserId}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingReview(null);
          }}
          initialData={editingReview ? {
            id: editingReview.id,
            title: editingReview.title,
            content: editingReview.content,
            rating: editingReview.rating
          } : undefined}
        />
      )}

      {/* Reviews List */}
      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Reviews ({stats.totalReviews})</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                  <option value="helpful">Most Helpful</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedReviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={currentUserId}
                  onEdit={setEditingReview}
                  onDelete={handleDeleteReview}
                  onHelpfulVote={fetchReviews}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};