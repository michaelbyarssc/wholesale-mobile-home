import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CustomerTrackingMap } from '@/components/delivery/CustomerTrackingMap';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from 'lucide-react';

export default function Track() {
  const [searchParams] = useSearchParams();
  const [trackingToken, setTrackingToken] = useState(searchParams.get('token') || '');
  const [inputToken, setInputToken] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputToken.trim()) {
      setTrackingToken(inputToken.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <MapPin className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Track Your Delivery</h1>
            </div>
            <p className="text-muted-foreground">
              Enter your tracking number or use the link from your delivery confirmation email
            </p>
          </div>

          {/* Tracking Input */}
          {!trackingToken && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Enter Tracking Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Enter your tracking token (e.g., track_abc123...)"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      className="text-center font-mono"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={!inputToken.trim()}>
                    <Search className="h-4 w-4 mr-2" />
                    Track Delivery
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Tracking Results */}
          {trackingToken && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Delivery Tracking</h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTrackingToken('');
                    setInputToken('');
                  }}
                >
                  Track Different Delivery
                </Button>
              </div>

              <CustomerTrackingMap 
                trackingToken={trackingToken}
                height="600px"
              />
            </div>
          )}

          {/* Help Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">How to find your tracking information:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Check your delivery confirmation email for a tracking link</li>
                  <li>Your tracking token starts with "track_" followed by letters and numbers</li>
                  <li>Contact customer service if you can't find your tracking information</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">Real-time updates:</h4>
                <p className="text-sm text-muted-foreground">
                  Your delivery map updates automatically every 15 seconds when your driver is on the way. 
                  You'll see the planned route when your delivery is scheduled and live GPS tracking once your driver starts the delivery.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}