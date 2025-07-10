import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Mail, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
interface NewsletterSignupProps {
  variant?: "default" | "compact" | "inline";
  className?: string;
  title?: string;
  description?: string;
}
export const NewsletterSignup = ({
  variant = "default",
  className = "",
  title = "Stay Updated",
  description = "Get notified about new mobile home inventory and special offers"
}: NewsletterSignupProps) => {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferences, setPreferences] = useState({
    new_inventory: true,
    price_updates: false,
    maintenance_tips: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.from("newsletter_subscribers").insert({
        email: email.trim().toLowerCase(),
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        preferences,
        source: "website"
      });
      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          toast({
            title: "Already Subscribed",
            description: "This email is already subscribed to our newsletter.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast({
          title: "Successfully Subscribed!",
          description: "Thank you for subscribing to our newsletter. You'll receive updates about new inventory."
        });

        // Reset form
        setEmail("");
        setFirstName("");
        setLastName("");
        setPhone("");
      }
    } catch (error) {
      console.error("Newsletter signup error:", error);
      toast({
        title: "Subscription Failed",
        description: "There was an error subscribing to the newsletter. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  if (isSubscribed && variant === "compact") {
    return <div className={`flex items-center gap-2 text-green-600 ${className}`}>
        <Check className="w-4 h-4" />
        <span className="text-sm font-medium">Successfully subscribed!</span>
      </div>;
  }
  if (variant === "compact") {
    return <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{title}</span>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 text-sm" disabled={isLoading} />
          <Button type="submit" size="sm" disabled={isLoading || !email.trim()} className="shrink-0">
            {isLoading ? "..." : "Subscribe"}
          </Button>
        </form>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>;
  }
  if (variant === "inline") {
    return <div className={`bg-primary/5 border border-primary/20 rounded-lg p-4 ${className}`}>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1">
            <h3 className="font-semibold mb-1 text-slate-50">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2 w-full sm:w-auto">
            <Input type="email" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} className="flex-1 sm:w-64" disabled={isLoading} />
            <Button type="submit" disabled={isLoading || !email.trim()} className="shrink-0">
              {isLoading ? "..." : "Subscribe"}
            </Button>
          </form>
        </div>
      </div>;
  }

  // Default card variant
  return <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <CardTitle>{title}</CardTitle>
        </div>
        {description && <p className="text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {isSubscribed ? <div className="text-center py-4">
            <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <h3 className="font-semibold text-green-700 mb-2">Successfully Subscribed!</h3>
            <p className="text-muted-foreground">
              Thank you for subscribing. You'll receive updates about new mobile home inventory.
            </p>
          </div> : <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name (Optional)</Label>
                <Input id="firstName" type="text" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={isLoading} />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name (Optional)</Label>
                <Input id="lastName" type="text" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} disabled={isLoading} />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} required />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input id="phone" type="tel" placeholder="(555) 123-4567" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
            </div>

            <div className="space-y-3">
              <Label>Email Preferences</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="new_inventory" checked={preferences.new_inventory} onCheckedChange={checked => setPreferences(prev => ({
                ...prev,
                new_inventory: !!checked
              }))} />
                  <Label htmlFor="new_inventory" className="text-sm">
                    New inventory notifications
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="price_updates" checked={preferences.price_updates} onCheckedChange={checked => setPreferences(prev => ({
                ...prev,
                price_updates: !!checked
              }))} />
                  <Label htmlFor="price_updates" className="text-sm">
                    Price updates and special offers
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="maintenance_tips" checked={preferences.maintenance_tips} onCheckedChange={checked => setPreferences(prev => ({
                ...prev,
                maintenance_tips: !!checked
              }))} />
                  <Label htmlFor="maintenance_tips" className="text-sm">
                    Maintenance tips and guides
                  </Label>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !email.trim()}>
              {isLoading ? "Subscribing..." : "Subscribe to Newsletter"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You can unsubscribe at any time. We respect your privacy and will never share your information.
            </p>
          </form>}
      </CardContent>
    </Card>;
};