
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DropResult } from '@hello-pangea/dnd';
import { ImageUploadSection } from './ImageUploadSection';
import { ImageListSection } from './ImageListSection';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

interface MobileHomeImageManagerProps {
  mobileHome: MobileHome;
}

export const MobileHomeImageManager = ({ mobileHome }: MobileHomeImageManagerProps) => {
  const { toast } = useToast();
  const [images, setImages] = useState<MobileHomeImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [labelText, setLabelText] = useState<string>('');

  useEffect(() => {
    fetchImages();
  }, [mobileHome]);

  const fetchImages = async () => {
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
    const fileName = `${mobileHome.id}/${Date.now()}.${fileExt}`;
    
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
    if (!files) return;

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

  return (
    <div className="space-y-4">
      <ImageUploadSection
        imagesCount={images.length}
        uploading={uploading}
        onFileUpload={handleFileUpload}
      />
      
      <ImageListSection
        images={images}
        editingLabel={editingLabel}
        labelText={labelText}
        onImageDragEnd={handleImageDragEnd}
        onStartEditLabel={handleStartEditLabel}
        onSaveLabel={handleSaveLabel}
        onCancelEditLabel={handleCancelEditLabel}
        onLabelTextChange={setLabelText}
        onDeleteImage={handleDeleteImage}
      />
    </div>
  );
};
