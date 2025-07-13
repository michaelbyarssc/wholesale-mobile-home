import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Home, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { formatDistanceToNow } from 'date-fns';

type RecentPurchase = Tables<"recent_purchases">;
type SocialProofSettings = Tables<"social_proof_settings">;

interface SocialProofBannerProps {
  variant?: "floating" | "embedded" | "header";
  className?: string;
}

export const SocialProofBanner = ({ variant = "floating", className = "" }: SocialProofBannerProps) => {
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [settings, setSettings] = useState<SocialProofSettings | null>(null);
  const [currentPurchaseIndex, setCurrentPurchaseIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings
        const { data: settingsData } = await supabase
          .from("social_proof_settings")
          .select("*")
          .single();

        if (settingsData) {
          setSettings(settingsData);

          // Fetch recent purchases if enabled
          if (settingsData.show_recent_purchases) {
            const { data: purchasesData } = await supabase
              .from("recent_purchases")
              .select("*")
              .eq("active", true)
              .order("purchase_date", { ascending: false })
              .limit(settingsData.recent_purchases_limit);

            if (purchasesData) {
              setRecentPurchases(purchasesData);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching social proof data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (recentPurchases.length > 1 && settings?.show_recent_purchases) {
      const interval = setInterval(() => {
        setCurrentPurchaseIndex((prev) => (prev + 1) % recentPurchases.length);
      }, 6000); // Change every 6 seconds

      return () => clearInterval(interval);
    }
  }, [recentPurchases.length, settings?.show_recent_purchases]);

  if (!settings || (!settings.show_recent_purchases && !settings.show_customer_count)) {
    return null;
  }

  const currentPurchase = recentPurchases[currentPurchaseIndex];

  if (variant === "header") {
    return (
      <div className={`bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 ${className}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
          <div className="flex items-center gap-4 text-sm font-medium">
            {settings.show_customer_count && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{settings.customer_count.toLocaleString()}+ Happy Customers</span>
              </div>
            )}
            {settings.show_homes_sold && (
              <div className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                <span>{settings.homes_sold_count.toLocaleString()}+ Homes Sold</span>
              </div>
            )}
            {settings.show_recent_purchases && currentPurchase && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>
                  {currentPurchase.customer_first_name} from {currentPurchase.customer_location} just purchased a {currentPurchase.mobile_home_model}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "embedded") {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
        {settings.show_homes_sold && (
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-4">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-2">
                {settings.homes_sold_count.toLocaleString()}+
              </div>
              <p className="text-muted-foreground">Homes Delivered</p>
            </CardContent>
          </Card>
        )}

        {settings.show_customer_count && (
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary mb-2">
                {settings.customer_count.toLocaleString()}+
              </div>
              <p className="text-muted-foreground">Satisfied Customers</p>
            </CardContent>
          </Card>
        )}

        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-2">
              {settings.years_in_business}+
            </div>
            <p className="text-muted-foreground">Years in Business</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Floating variant
  if (!isVisible || !settings.show_recent_purchases || !currentPurchase) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 ${className}`}>
      <Card className="bg-white shadow-lg border-l-4 border-l-green-500 animate-slide-in-bottom">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <Badge variant="secondary" className="text-xs">
                  Recent Purchase
                </Badge>
              </div>
              
              <p className="text-sm font-medium text-gray-900 mb-1">
                <span className="font-semibold">{currentPurchase.customer_first_name}</span> from{" "}
                <span className="text-primary">{currentPurchase.customer_location}</span>
              </p>
              
              <p className="text-sm text-gray-600 mb-2">
                Purchased: <span className="font-medium">{currentPurchase.mobile_home_model}</span>
                {currentPurchase.purchase_amount && (
                  <span className="text-green-600 font-semibold ml-2">
                    ${currentPurchase.purchase_amount.toLocaleString()}
                  </span>
                )}
              </p>
              
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(currentPurchase.purchase_date), { addSuffix: true })}
              </p>
            </div>
            
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};