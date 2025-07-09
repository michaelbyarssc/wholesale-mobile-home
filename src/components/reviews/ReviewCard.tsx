import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, Trash2, Edit } from "lucide-react";
import { StarRating } from "./StarRating";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface ReviewCardProps {
  review: Review;
  currentUserId?: string;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => void;
  onHelpfulVote?: (reviewId: string) => void;
}

export const ReviewCard = ({ 
  review, 
  currentUserId, 
  onEdit, 
  onDelete, 
  onHelpfulVote 
}: ReviewCardProps) => {
  const [hasVoted, setHasVoted] = useState(false);
  const { toast } = useToast();

  const handleHelpfulClick = async () => {
    if (!currentUserId) {
      toast({
        title: "Login Required",
        description: "Please log in to vote on reviews.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (hasVoted) {
        const { error } = await supabase
          .from("review_helpful_votes")
          .delete()
          .eq("review_id", review.id)
          .eq("user_id", currentUserId);

        if (error) throw error;
        setHasVoted(false);
      } else {
        const { error } = await supabase
          .from("review_helpful_votes")
          .insert({
            review_id: review.id,
            user_id: currentUserId
          });

        if (error) throw error;
        setHasVoted(true);
      }

      onHelpfulVote?.(review.id);
    } catch (error) {
      console.error("Error voting on review:", error);
      toast({
        title: "Error",
        description: "Failed to record your vote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
              {getInitials(review.profiles?.first_name, review.profiles?.last_name)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">
                  {review.profiles?.first_name || "Anonymous"} {review.profiles?.last_name || ""}
                </h4>
                {review.verified_purchase && (
                  <Badge variant="secondary" className="text-xs">
                    Verified Purchase
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={review.rating} readonly size="sm" />
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.created_at)}
                </span>
              </div>
            </div>
          </div>
          
          {currentUserId === review.user_id && (
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(review)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(review.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <h3 className="font-semibold mb-2">{review.title}</h3>
        <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{review.content}</p>
        
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHelpfulClick}
            className={`flex items-center gap-2 ${hasVoted ? "text-primary" : ""}`}
          >
            <ThumbsUp className={`h-4 w-4 ${hasVoted ? "fill-current" : ""}`} />
            Helpful ({review.helpful_votes})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};