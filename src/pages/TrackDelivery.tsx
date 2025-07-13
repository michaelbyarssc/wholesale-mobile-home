import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Truck, Search, Mail, MessageSquare, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export default function TrackDelivery() {
  const [trackingToken, setTrackingToken] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTrackDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingToken.trim()) {
      toast.error("Please enter a tracking token");
      return;
    }

    setLoading(true);
    
    try {
      // Navigate to the delivery portal with the token
      navigate(`/delivery-portal/${trackingToken.trim()}`);
    } catch (error) {
      toast.error("Please check your tracking token and try again");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Track Your Delivery</h1>
          <p className="text-muted-foreground">
            Enter your tracking token to see real-time updates on your mobile home delivery
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Enter Tracking Information
            </CardTitle>
            <CardDescription>
              Use the tracking token sent to you via email or SMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrackDelivery} className="space-y-4">
              <div>
                <label htmlFor="tracking-token" className="block text-sm font-medium mb-2">
                  Tracking Token
                </label>
                <Input
                  id="tracking-token"
                  type="text"
                  placeholder="track_abc123xyz..."
                  value={trackingToken}
                  onChange={(e) => setTrackingToken(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your tracking token starts with "track_" and was sent to you via email or SMS
                </p>
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Loading..." : "Track My Delivery"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              How to Find Your Tracking Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Check Your Email</h4>
                  <p className="text-sm text-muted-foreground">
                    Look for an email with the subject "Your Mobile Home Delivery is Scheduled" 
                    containing your tracking link and token.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Check Your Text Messages</h4>
                  <p className="text-sm text-muted-foreground">
                    Look for an SMS containing your delivery information and tracking link.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium">Direct Link</h4>
                  <p className="text-sm text-muted-foreground">
                    If you received a direct tracking link, simply click it to view your delivery status.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Still can't find your tracking token?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Contact our customer service team with your delivery number or order information, 
                and we'll help you track your delivery.
              </p>
              <div className="text-sm">
                <p><strong>Phone:</strong> (555) 123-4567</p>
                <p><strong>Email:</strong> support@yourcompany.com</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="mr-4"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}