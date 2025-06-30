import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, Image, Edit2, GripVertical, Move } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

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
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelText, setLabelText] = useState<string>('');

  useEffect(() => {
    if (mobileHome) {
      setFormData(mobileHome);
      if (mobileHome.features) {
        if (Array.isArray(mobileHome.features)) {
          setFeatures(mobileHome.features.join('\n'));
        } else if (typeof mobileHome.features === 'string') {
          setFeatures(mobileHome.features);
        } else {
          setFeatures('');
        }
      } else {
        setFeatures('');
      }
      fetchImages();
    }
  }, [mobileHome]);

  const fetchImages = async () => {
    if (!mobileHome) return;
    
    const { data, error } = await supabase
      .from('mobile_home_images')
      .select('*')
      .eq('mobile_home_id', mobileHome.id)
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

  const convertToJpg = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img') as HTMLImageElement;
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw white background first (for transparency)
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the image
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const convertedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(convertedFile);
            } else {
              reject(new Error('Failed to convert image'));
            }
          }, 'image/jpeg', 0.9);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = 'jpg'; // Always use jpg extension after conversion
    const fileName = `${mobileHome!.id}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('mobile-home-images')
      .upload(fileName, file);

    if (error) {
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('mobile-home-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !mobileHome) return;

    if (images.length + files.length > 40) {
      toast({
        title: "Upload Limit Exceeded",
        description: `You can only upload up to 40 images. Currently you have ${images.length} images.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    for (const file of Array.from(files)) {
      try {
        // Check if file type is supported
        const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (!supportedTypes.includes(file.type)) {
          toast({
            title: "Unsupported File Type",
            description: `${file.name} is not a supported image format. Please use JPG, PNG, WebP, GIF, or AVIF.`,
            variant: "destructive",
          });
          continue;
        }

        let fileToUpload = file;
        let conversionMessage = '';

        // Convert to JPG if not already JPG
        if (file.type !== 'image/jpeg' && !file.name.toLowerCase().endsWith('.jpg')) {
          try {
            fileToUpload = await convertToJpg(file);
            conversionMessage = ` (converted from ${file.type.split('/')[1].toUpperCase()} to JPG)`;
          } catch (conversionError) {
            console.error('Error converting image:', conversionError);
            toast({
              title: "Conversion Error",
              description: `Failed to convert ${file.name} to JPG format.`,
              variant: "destructive",
            });
            continue;
          }
        }

        const imageUrl = await uploadImageToStorage(fileToUpload);
        
        const { error } = await supabase
          .from('mobile_home_images')
          .insert({
            mobile_home_id: mobileHome.id,
            image_url: imageUrl,
            image_type: 'general',
            display_order: images.length,
            alt_text: file.name.replace(/\.[^/.]+$/, '')
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: `Image uploaded successfully${conversionMessage}.`,
        });
        
        await fetchImages();
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: "Error",
          description: `Failed to upload ${file.name}.`,
          variant: "destructive",
        });
      }
    }
    
    setUploading(false);
    event.target.value = '';
  };

  const deleteImageFromStorage = async (imageUrl: string) => {
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

  const handleDeleteImage = async (imageId: string) => {
    try {
      const imageToDelete = images.find(img => img.id === imageId);
      
      const { error } = await supabase
        .from('mobile_home_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
      
      if (imageToDelete && imageToDelete.image_url.includes('supabase')) {
        await deleteImageFromStorage(imageToDelete.image_url);
      }
      
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

  const handleStartEditLabel = (imageId: string, currentLabel: string | null) => {
    setEditingLabel(imageId);
    setLabelText(currentLabel || '');
  };

  const handleSaveLabel = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('mobile_home_images')
        .update({ alt_text: labelText.trim() || null })
        .eq('id', imageId);

      if (error) throw error;
      
      setEditingLabel(null);
      setLabelText('');
      await fetchImages();
      
      toast({
        title: "Success",
        description: "Image label updated successfully.",
      });
    } catch (error) {
      console.error('Error updating label:', error);
      toast({
        title: "Error",
        description: "Failed to update image label.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEditLabel = () => {
    setEditingLabel(null);
    setLabelText('');
  };

  const handleImageDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    // Create new array with reordered images
    const reorderedImages = Array.from(images);
    const [removed] = reorderedImages.splice(sourceIndex, 1);
    reorderedImages.splice(destinationIndex, 0, removed);

    // Update display_order for all images
    const updates = reorderedImages.map((image, index) => ({
      id: image.id,
      display_order: index
    }));

    // Optimistically update local state
    setImages(reorderedImages.map((image, index) => ({
      ...image,
      display_order: index
    })));

    try {
      // Update database
      for (const update of updates) {
        const { error } = await supabase
          .from('mobile_home_images')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Image order updated successfully.",
      });
    } catch (error) {
      console.error('Error updating image order:', error);
      toast({
        title: "Error",
        description: "Failed to update image order.",
        variant: "destructive",
      });
      // Revert optimistic update on error
      await fetchImages();
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name || ''}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="price">Cost (Internal Price)</Label>
              <div className="space-y-2">
                {formData.price && (
                  <div className="text-sm text-gray-600 font-medium">
                    Current Cost: {formatPrice(formData.price)}
                  </div>
                )}
                <Input
                  id="price"
                  type="number"
                  value={formData.price || ''}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  placeholder="Enter internal cost without $ or commas"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="retail_price">Retail Price (Public Display)</Label>
              <div className="space-y-2">
                {formData.retail_price && (
                  <div className="text-sm text-gray-600 font-medium">
                    Current Retail Price: {formatPrice(formData.retail_price)}
                  </div>
                )}
                <Input
                  id="retail_price"
                  type="number"
                  value={formData.retail_price || ''}
                  onChange={(e) => handleInputChange('retail_price', parseFloat(e.target.value))}
                  placeholder="Enter retail price for public display"
                />
                <p className="text-xs text-gray-500">
                  This price will be shown to visitors who are not logged in
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="minimum_profit">Minimum Profit per Home</Label>
              <div className="space-y-2">
                {formData.minimum_profit !== undefined && (
                  <div className="text-sm text-gray-600 font-medium">
                    Current Minimum Profit: {formatPrice(formData.minimum_profit)}
                  </div>
                )}
                <Input
                  id="minimum_profit"
                  type="number"
                  value={formData.minimum_profit || ''}
                  onChange={(e) => handleInputChange('minimum_profit', parseFloat(e.target.value))}
                  placeholder="Enter minimum profit amount"
                />
              </div>
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

          {/* Right Column - Enhanced Images Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Images ({images.length}/40)</h3>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading || images.length >= 40}
                />
                <Button size="sm" disabled={uploading || images.length >= 40}>
                  <Upload className="h-4 w-4 mr-1" />
                  {uploading ? 'Converting & Uploading...' : 'Upload Images'}
                </Button>
              </div>
            </div>
            
            {images.length >= 40 && (
              <p className="text-sm text-amber-600">
                Maximum of 40 images reached. Delete some images to upload new ones.
              </p>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 text-blue-700">
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Auto-conversion enabled:</span>
              </div>
              <div className="text-xs text-blue-600 mt-1 space-y-1">
                <p>• All images automatically converted to JPG format</p>
                <p>• Supports: JPG, PNG, WebP, GIF, AVIF uploads</p>
                <p>• Transparent backgrounds become white</p>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2 text-blue-700">
                <Move className="h-4 w-4" />
                <span className="text-sm font-medium">How to arrange images:</span>
              </div>
              <div className="text-xs text-blue-600 mt-1 space-y-1">
                <p>• Grab the <GripVertical className="inline h-3 w-3" /> handle to drag and reorder</p>
                <p>• First image becomes the main showcase photo</p>
                <p>• Drop zones will highlight in blue when dragging</p>
              </div>
            </div>
            
            <DragDropContext onDragEnd={handleImageDragEnd}>
              <Droppable droppableId="images">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 max-h-96 overflow-y-auto p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-100 border-2 border-blue-300 border-dashed' : 'bg-gray-50'
                    }`}
                  >
                    {images.map((image, index) => (
                      <Draggable key={image.id} draggableId={image.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`relative group border-2 rounded-lg p-3 bg-white transition-all ${
                              snapshot.isDragging 
                                ? 'shadow-xl border-blue-400 bg-blue-50 rotate-1 scale-105' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              {/* Enhanced Drag Handle */}
                              <div
                                {...provided.dragHandleProps}
                                className={`flex-shrink-0 cursor-grab active:cursor-grabbing p-2 rounded-md transition-colors ${
                                  snapshot.isDragging 
                                    ? 'bg-blue-200 text-blue-700' 
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                                }`}
                                title="Drag to reorder"
                              >
                                <GripVertical className="h-5 w-5" />
                              </div>
                              
                              {/* Image Preview */}
                              <div className="flex-shrink-0">
                                <img
                                  src={image.image_url}
                                  alt={image.alt_text || ''}
                                  className="w-20 h-20 object-cover rounded-md border"
                                />
                                {index === 0 && (
                                  <div className="absolute -top-1 -left-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                    Main
                                  </div>
                                )}
                              </div>
                              
                              {/* Image Info and Controls */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-gray-700">
                                    Image #{index + 1}
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleStartEditLabel(image.id, image.alt_text)}
                                      className="bg-blue-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                                      title="Edit label"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteImage(image.id)}
                                      className="bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                      title="Delete image"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                
                                {editingLabel === image.id ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={labelText}
                                      onChange={(e) => setLabelText(e.target.value)}
                                      placeholder="Enter image label"
                                      className="text-sm"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveLabel(image.id)}
                                        className="text-xs px-3 py-1 h-7"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEditLabel}
                                        className="text-xs px-3 py-1 h-7"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-600 truncate" title={image.alt_text || 'No label'}>
                                    {image.alt_text || 'No label'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {images.length === 0 && (
              <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="text-center text-gray-500">
                  <Image className="h-8 w-8 mx-auto mb-2" />
                  <span className="text-sm">No images uploaded</span>
                  <p className="text-xs text-gray-400 mt-1">Upload up to 40 images</p>
                  <p className="text-xs text-gray-400">Auto-converts to JPG format</p>
                </div>
              </div>
            )}
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
