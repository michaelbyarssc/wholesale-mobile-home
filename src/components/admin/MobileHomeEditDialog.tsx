
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Image } from 'lucide-react';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: 'Tru' | 'Epic';
  model: string;
  price: number;
  square_footage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  length_feet: number | null;
  width_feet: number | null;
  features: string[] | null;
  description: string | null;
  active: boolean;
}

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

interface MobileHomeEditDialogProps {
  mobileHome: MobileHome | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const MobileHomeEditDialog = ({ mobileHome, open, onClose, onSave }: MobileHomeEditDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<MobileHome>>({});
  const [features, setFeatures] = useState<string>('');
  const [images, setImages] = useState<MobileHomeImage[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (mobileHome) {
      setFormData(mobileHome);
      setFeatures(mobileHome.features?.join('\n') || '');
      fetchImages();
    }
  }, [mobileHome]);

  const fetchImages = async () => {
    if (!mobileHome) return;
    
    const { data, error } = await supabase
      .from('mobile_home_images')
      .select('*')
      .eq('mobile_home_id', mobileHome.id)
      .order('image_type')
      .order('display_order');

    if (error) {
      console.error('Error fetching images:', error);
    } else {
      setImages(data || []);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: string) => {
    const files = event.target.files;
    if (!files || !mobileHome) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      try {
        // For now, we'll use a placeholder URL since we don't have storage bucket set up
        // In a real implementation, you'd upload to Supabase Storage
        const imageUrl = URL.createObjectURL(file);
        
        const { error } = await supabase
          .from('mobile_home_images')
          .insert({
            mobile_home_id: mobileHome.id,
            image_url: imageUrl,
            image_type: imageType,
            display_order: images.filter(img => img.image_type === imageType).length,
            alt_text: `${mobileHome.manufacturer} ${mobileHome.model} ${imageType}`
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Image uploaded successfully.",
        });
        
        await fetchImages();
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: "Error",
          description: "Failed to upload image.",
          variant: "destructive",
        });
      }
    }
    
    setUploading(false);
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('mobile_home_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Image deleted successfully.",
      });
      
      await fetchImages();
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({
        title: "Error",
        description: "Failed to delete image.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!mobileHome) return;

    try {
      const featuresArray = features.split('\n').filter(f => f.trim()).map(f => f.trim());
      
      const { error } = await supabase
        .from('mobile_homes')
        .update({
          ...formData,
          features: featuresArray.length > 0 ? featuresArray : null
        })
        .eq('id', mobileHome.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mobile home updated successfully.",
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating mobile home:', error);
      toast({
        title: "Error",
        description: "Failed to update mobile home.",
        variant: "destructive",
      });
    }
  };

  if (!mobileHome) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Mobile Home: {mobileHome.manufacturer} {mobileHome.model}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer || ''}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="series">Series</Label>
              <Select value={formData.series} onValueChange={(value) => handleInputChange('series', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tru">Tru</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={formData.model || ''}
                onChange={(e) => handleInputChange('model', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="square_footage">Square Footage</Label>
              <Input
                id="square_footage"
                type="number"
                value={formData.square_footage || ''}
                onChange={(e) => handleInputChange('square_footage', parseInt(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  value={formData.bedrooms || ''}
                  onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.bathrooms || ''}
                  onChange={(e) => handleInputChange('bathrooms', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="length_feet">Length (ft)</Label>
                <Input
                  id="length_feet"
                  type="number"
                  value={formData.length_feet || ''}
                  onChange={(e) => handleInputChange('length_feet', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="width_feet">Width (ft)</Label>
                <Input
                  id="width_feet"
                  type="number"
                  value={formData.width_feet || ''}
                  onChange={(e) => handleInputChange('width_feet', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea
                id="features"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                rows={5}
                placeholder="Enter each feature on a new line"
              />
            </div>
          </div>

          {/* Right Column - Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Images</h3>
            
            {/* Image Upload Sections */}
            {['exterior', 'interior', 'floorplan'].map((imageType) => (
              <div key={imageType} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium capitalize">{imageType} Images</h4>
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, imageType)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <Button size="sm" disabled={uploading}>
                      <Upload className="h-4 w-4 mr-1" />
                      Upload
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {images.filter(img => img.image_type === imageType).map((image) => (
                    <div key={image.id} className="relative group">
                      <img
                        src={image.image_url}
                        alt={image.alt_text || ''}
                        className="w-full h-20 object-cover rounded"
                      />
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                {images.filter(img => img.image_type === imageType).length === 0 && (
                  <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded">
                    <div className="text-center text-gray-500">
                      <Image className="h-6 w-6 mx-auto mb-1" />
                      <span className="text-sm">No {imageType} images</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
