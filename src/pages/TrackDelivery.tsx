import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Truck, Search, Mail, MessageSquare, HelpCircle } from "lucide-react";
import { toast } from "sonner";

export default function TrackDelivery() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTrackDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!trackingNumber.trim()) {
      toast.error("Please enter your tracking number");
      return;
    }

    setLoading(true);
    
    try {
      // Navigate to the delivery portal with the tracking number
      navigate(`/delivery-portal/${trackingNumber.trim()}`);
    } catch (error) {
      toast.error("Please check your tracking number and try again");
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
            Enter your estimate number, invoice number, or delivery number to track your mobile home delivery
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Enter Tracking Information
            </CardTitle>
            <CardDescription>
              Enter your estimate number, invoice number, or delivery number
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrackDelivery} className="space-y-4">
              <div>
                <label htmlFor="tracking-number" className="block text-sm font-medium mb-2">
                  Tracking Number
                </label>
                <Input
                  id="tracking-number"
                  type="text"
                  placeholder="WMH-E-123456, WMH-I-123456, or WMH-D-123456"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your estimate number (WMH-E-), invoice number (WMH-I-), or delivery number (WMH-D-)
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
              How to Find Your Tracking Number
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
                    Look for your estimate, invoice, or delivery confirmation email 
                    containing your tracking number (starts with WMH-E-, WMH-I-, or WMH-D-).
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
                    Look for an SMS containing your estimate, invoice, or delivery number.
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
              <h4 className="font-medium mb-2">Still can't find your tracking number?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Contact our customer service team with your order information, 
                and we'll help you track your delivery.
              </p>
              <div className="text-sm">
                <p><strong>Phone:</strong> 864-680-4030</p>
                <p><strong>Email:</strong> Support@WholesaleMobileHome.com</p>
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