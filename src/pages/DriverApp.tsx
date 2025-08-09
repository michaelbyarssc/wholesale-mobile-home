import React from "react";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Link } from "react-router-dom";
import { Truck, Download, ExternalLink, ShieldCheck } from "lucide-react";

const DriverApp: React.FC = () => {
  const { user, userProfile, handleLogout } = useAuthUser();
  const { cartItems } = useShoppingCart();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "WholesaleMobileHome Driver App",
    url: typeof window !== "undefined" ? window.location.href : "https://wholesalemobilehome.com/driver",
    applicationCategory: "BusinessApplication",
    operatingSystem: "iOS, Android, Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Driver App - Delivery Portal"
        description="Open the Driver Portal, manage deliveries, and install the app for quick access."
        keywords="driver app, delivery portal, mobile home delivery, driver login"
        structuredData={structuredData}
        type="website"
      />

      <Header user={user} userProfile={userProfile} cartItems={cartItems} isLoading={false} onLogout={handleLogout} onToggleCart={() => {}} />

      <main>
        {/* Hero */}
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Driver App</h1>
            <p className="text-muted-foreground mb-6">Fast access to the Driver Portal and easy install instructions.</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/delivery?mode=driver">
                  Open Driver Portal
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/delivery">
                  Track a Delivery
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Install prompt */}
        <section className="py-2">
          <div className="container mx-auto px-4 max-w-3xl">
            <InstallPrompt variant="card" />
          </div>
        </section>

        {/* Simple instructions */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-4xl grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="h-5 w-5 mr-2 text-primary" />
                  Install on Your Phone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">iPhone (Safari):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the Share icon</li>
                  <li>Choose "Add to Home Screen"</li>
                  <li>Tap Add</li>
                </ol>
                <div className="h-px bg-border my-2" />
                <p className="font-medium text-foreground">Android (Chrome):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the 3-dot menu</li>
                  <li>Choose "Install app" or "Add to Home screen"</li>
                  <li>Confirm</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldCheck className="h-5 w-5 mr-2 text-primary" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Bookmark this page: /driver</p>
                <p>• If asked to log in, use your driver email and password.</p>
                <p>• Offline? The app works offline and syncs when back online.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default DriverApp;
