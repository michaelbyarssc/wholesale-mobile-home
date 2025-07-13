import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Users, Home, Calendar, RefreshCw } from 'lucide-react';

interface SocialProofSettings {
  id: string;
  show_recent_purchases: boolean;
  show_testimonials: boolean;
  show_customer_count: boolean;
  show_homes_sold: boolean;
  recent_purchases_limit: number;
  testimonials_rotation_seconds: number;
  customer_count: number;
  homes_sold_count: number;
  years_in_business: number;
}

export const SocialProofManager = () => {
  const [settings, setSettings] = useState<SocialProofSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('social_proof_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching social proof settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('social_proof_settings')
        .update({
          show_recent_purchases: settings.show_recent_purchases,
          show_testimonials: settings.show_testimonials,
          show_customer_count: settings.show_customer_count,
          show_homes_sold: settings.show_homes_sold,
          recent_purchases_limit: settings.recent_purchases_limit,
          testimonials_rotation_seconds: settings.testimonials_rotation_seconds,
          customer_count: settings.customer_count,
          homes_sold_count: settings.homes_sold_count,
          years_in_business: settings.years_in_business,
          updated_at: new Date().toISOString()
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Social proof settings updated successfully!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof SocialProofSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading settings...
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">No settings found. Please create initial settings first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Social Proof Settings
          </CardTitle>
          <CardDescription>
            Manage your website's social proof elements and trust signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display Toggles */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Display Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="show-customer-count" className="font-medium">
                    Show Customer Count
                  </Label>
                  <p className="text-sm text-muted-foreground">Display total customers served</p>
                </div>
                <Switch
                  id="show-customer-count"
                  checked={settings.show_customer_count}
                  onCheckedChange={(checked) => updateSetting('show_customer_count', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="show-homes-sold" className="font-medium">
                    Show Homes Sold
                  </Label>
                  <p className="text-sm text-muted-foreground">Display total homes delivered</p>
                </div>
                <Switch
                  id="show-homes-sold"
                  checked={settings.show_homes_sold}
                  onCheckedChange={(checked) => updateSetting('show_homes_sold', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="show-recent-purchases" className="font-medium">
                    Show Recent Purchases
                  </Label>
                  <p className="text-sm text-muted-foreground">Display recent purchase notifications</p>
                </div>
                <Switch
                  id="show-recent-purchases"
                  checked={settings.show_recent_purchases}
                  onCheckedChange={(checked) => updateSetting('show_recent_purchases', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="show-testimonials" className="font-medium">
                    Show Testimonials
                  </Label>
                  <p className="text-sm text-muted-foreground">Display customer testimonials</p>
                </div>
                <Switch
                  id="show-testimonials"
                  checked={settings.show_testimonials}
                  onCheckedChange={(checked) => updateSetting('show_testimonials', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Home className="h-5 w-5" />
              Statistics (Manually Editable)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-count">Total Customers</Label>
                <Input
                  id="customer-count"
                  type="number"
                  value={settings.customer_count}
                  onChange={(e) => updateSetting('customer_count', parseInt(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">Displayed as: {settings.customer_count.toLocaleString()}+ Happy Customers</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homes-sold-count" className="text-green-600 font-medium">
                  Homes Sold This Month
                </Label>
                <Input
                  id="homes-sold-count"
                  type="number"
                  value={settings.homes_sold_count}
                  onChange={(e) => updateSetting('homes_sold_count', parseInt(e.target.value) || 0)}
                  className="text-lg font-semibold border-green-300 focus:border-green-500"
                />
                <p className="text-xs text-muted-foreground">Displayed as: {settings.homes_sold_count.toLocaleString()}+ Homes Delivered</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="years-in-business">Years in Business</Label>
                <Input
                  id="years-in-business"
                  type="number"
                  value={settings.years_in_business}
                  onChange={(e) => updateSetting('years_in_business', parseInt(e.target.value) || 0)}
                  className="text-lg font-semibold"
                />
                <p className="text-xs text-muted-foreground">Displayed as: {settings.years_in_business}+ Years in Business</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recent-purchases-limit">Recent Purchases Limit</Label>
                <Input
                  id="recent-purchases-limit"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.recent_purchases_limit}
                  onChange={(e) => updateSetting('recent_purchases_limit', parseInt(e.target.value) || 10)}
                />
                <p className="text-xs text-muted-foreground">Maximum number of recent purchases to show</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testimonials-rotation">Testimonials Rotation (seconds)</Label>
                <Input
                  id="testimonials-rotation"
                  type="number"
                  min="3"
                  max="30"
                  value={settings.testimonials_rotation_seconds}
                  onChange={(e) => updateSetting('testimonials_rotation_seconds', parseInt(e.target.value) || 8)}
                />
                <p className="text-xs text-muted-foreground">How often testimonials change</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};