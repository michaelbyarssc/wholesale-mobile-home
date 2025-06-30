import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MobileHomeEditDialog } from './MobileHomeEditDialog';
import { MobileHomesDragDrop } from './MobileHomesDragDrop';
import { formatPrice } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Plus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type MobileHomeInsert = Database['public']['Tables']['mobile_homes']['Insert'];

// Extract AddFormContent as a separate component outside the main component
const AddFormContent = React.memo(({ 
  formData, 
  onInputChange, 
  onSubmit 
}: {
  formData: {
    manufacturer: string;
    series: string;
    model: string;
    display_name: string;
    price: string;
    retail_price: string;
    minimum_profit: string;
  };
  onInputChange: (field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) => (
  <form onSubmit={onSubmit} className="space-y-4 p-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="manufacturer">Manufacturer</Label>
        <Input
          id="manufacturer"
          value={formData.manufacturer}
          onChange={(e) => onInputChange('manufacturer', e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="series">Series</Label>
        <Input
          id="series"
          value={formData.series}
          onChange={(e) => onInputChange('series', e.target.value)}
          placeholder="Enter series name (e.g., Tru, Epic, Classic)"
          required
        />
      </div>
      <div>
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          value={formData.model}
          onChange={(e) => onInputChange('model', e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="display_name">Display Name (e.g., Bliss, Delight, Elation)</Label>
        <Input
          id="display_name"
          value={formData.display_name}
          onChange={(e) => onInputChange('display_name', e.target.value)}
          placeholder="Enter OwnTru model name"
          required
        />
      </div>
      <div>
        <Label htmlFor="price">Cost (Internal Price)</Label>
        <Input
          id="price"
          type="number"
          value={formData.price}
          onChange={(e) => onInputChange('price', e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="retail_price">Retail Price (Public Display)</Label>
        <Input
          id="retail_price"
          type="number"
          value={formData.retail_price}
          onChange={(e) => onInputChange('retail_price', e.target.value)}
          placeholder="Enter retail price for public display"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="minimum_profit">Minimum Profit per Home</Label>
        <Input
          id="minimum_profit"
          type="number"
          value={formData.minimum_profit}
          onChange={(e) => onInputChange('minimum_profit', e.target.value)}
          placeholder="0"
        />
      </div>
    </div>
    <Button type="submit" className="w-full">Add Mobile Home</Button>
  </form>
));

export const MobileHomesTab = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHome, setEditingHome] = useState<MobileHome | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: 'Clayton',
    series: '',
    model: '',
    display_name: '',
    price: '',
    retail_price: '',
    minimum_profit: ''
  });

  const { data: mobileHomes = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-mobile-homes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as MobileHome[];
    }
  });

  const { data: existingSeries = [] } = useQuery({
    queryKey: ['mobile-home-series'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('series')
        .order('series');
      
      if (error) throw error;
      
      const uniqueSeries = [...new Set(data.map(item => item.series))];
      return uniqueSeries;
    }
  });

  // Use useCallback to prevent unnecessary re-renders
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.series.trim()) {
      toast({
        title: "Error",
        description: "Series is required.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get the next display_order value
      const { data: maxOrderData } = await supabase
        .from('mobile_homes')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);
        
      const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

      const insertData: MobileHomeInsert = {
        manufacturer: formData.manufacturer,
        series: formData.series.trim(),
        model: formData.model,
        display_name: formData.display_name,
        price: parseFloat(formData.price),
        retail_price: formData.retail_price ? parseFloat(formData.retail_price) : null,
        minimum_profit: parseFloat(formData.minimum_profit) || 0,
        display_order: nextOrder
      };

      const { error } = await supabase
        .from('mobile_homes')
        .insert(insertData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mobile home added successfully.",
      });

      setFormData({ manufacturer: 'Clayton', series: '', model: '', display_name: '', price: '', retail_price: '', minimum_profit: '' });
      setShowAddForm(false);
      refetch();
    } catch (error) {
      console.error('Error adding mobile home:', error);
      toast({
        title: "Error",
        description: "Failed to add mobile home.",
        variant: "destructive",
      });
    }
  }, [formData, toast, refetch]);

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('mobile_homes')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      refetch();
      
      toast({
        title: "Success",
        description: `Mobile home ${!active ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      console.error('Error updating mobile home:', error);
      toast({
        title: "Error",
        description: "Failed to update mobile home status.",
        variant: "destructive",
      });
    }
  };

  const deleteImageFromStorage = async (imageUrl: string) => {
    if (!imageUrl.includes('supabase')) return;
    
    const urlParts = imageUrl.split('/');
    const bucketIndex = urlParts.findIndex(part => part === 'mobile-home-images');
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      const filePath = urlParts.slice(bucketIndex + 1).join('/');
      
      const { error } = await supabase.storage
        .from('mobile-home-images')
        .remove([filePath]);
      
      if (error) {
        console.error('Error deleting file from storage:', error);
      }
    }
  };

  const deleteMobileHome = async (homeId: string, homeName: string) => {
    if (!confirm(`Are you sure you want to delete "${homeName}"? This action cannot be undone and will also remove any estimates associated with this mobile home.`)) {
      return;
    }

    try {
      const { data: images, error: imagesError } = await supabase
        .from('mobile_home_images')
        .select('image_url')
        .eq('mobile_home_id', homeId);

      if (imagesError) {
        console.error('Error fetching images:', imagesError);
      }

      if (images && images.length > 0) {
        for (const image of images) {
          await deleteImageFromStorage(image.image_url);
        }
      }

      const { error: deleteImagesError } = await supabase
        .from('mobile_home_images')
        .delete()
        .eq('mobile_home_id', homeId);

      if (deleteImagesError) {
        console.error('Error deleting image records:', deleteImagesError);
      }

      const { error: updateEstimatesError } = await supabase
        .from('estimates')
        .update({ mobile_home_id: null })
        .eq('mobile_home_id', homeId);

      if (updateEstimatesError) {
        console.error('Error updating estimates:', updateEstimatesError);
        toast({
          title: "Error",
          description: "Failed to update related estimates.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('mobile_homes')
        .delete()
        .eq('id', homeId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Mobile home "${homeName}" deleted successfully.`,
      });

      refetch();
    } catch (error) {
      console.error('Error deleting mobile home:', error);
      toast({
        title: "Error",
        description: "Failed to delete mobile home.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading mobile homes...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-lg sm:text-xl">Mobile Homes Management</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              {isMobile ? (
                <Drawer open={showAddForm} onOpenChange={setShowAddForm}>
                  <DrawerTrigger asChild>
                    <Button className="flex-1 sm:flex-none">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Home
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Add New Mobile Home</DrawerTitle>
                    </DrawerHeader>
                    <AddFormContent 
                      formData={formData}
                      onInputChange={handleInputChange}
                      onSubmit={handleSubmit}
                    />
                  </DrawerContent>
                </Drawer>
              ) : (
                <Button onClick={() => setShowAddForm(!showAddForm)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {showAddForm ? 'Cancel' : 'Add Mobile Home'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {!isMobile && showAddForm && (
            <div className="mb-6 border rounded-lg">
              <AddFormContent 
                formData={formData}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
              />
            </div>
          )}

          <MobileHomesDragDrop
            mobileHomes={mobileHomes}
            onEdit={setEditingHome}
            onDelete={deleteMobileHome}
            onToggleActive={toggleActive}
            onRefetch={refetch}
          />
        </CardContent>
      </Card>

      <MobileHomeEditDialog
        mobileHome={editingHome}
        open={!!editingHome}
        onClose={() => setEditingHome(null)}
        onSave={refetch}
      />
    </div>
  );
};
