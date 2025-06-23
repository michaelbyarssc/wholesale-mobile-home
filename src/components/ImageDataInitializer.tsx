
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImageData {
  mobile_home_model: string;
  images: {
    url: string;
    type: 'exterior' | 'interior' | 'floorplan';
    display_order: number;
    alt_text: string;
  }[];
}

export const ImageDataInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Using actual mobile home images from your public directory
  const imageData: ImageData[] = [
    {
      mobile_home_model: 'Tru MH 14x56',
      images: [
        { url: '/images/mobile-home-exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x56 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x56 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x60',
      images: [
        { url: '/images/mobile-home-exterior-2.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x60 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x60 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x66',
      images: [
        { url: '/images/mobile-home-exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x66 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x66 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x70',
      images: [
        { url: '/images/mobile-home-exterior-2.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x70 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x70 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x76',
      images: [
        { url: '/images/mobile-home-exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 16x76 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 16x76 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x80',
      images: [
        { url: '/images/mobile-home-exterior-2.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 16x80 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 16x80 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x76',
      images: [
        { url: '/images/mobile-home-exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x76 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x76 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x80',
      images: [
        { url: '/images/mobile-home-exterior-2.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x80 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x80 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x84',
      images: [
        { url: '/images/mobile-home-exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x84 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x84 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x76',
      images: [
        { url: '/images/mobile-home-exterior-2.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x76 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x76 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x80',
      images: [
        { url: '/images/mobile-home-exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x80 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x80 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x84',
      images: [
        { url: '/images/mobile-home-exterior-2.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x84 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x84 Interior View' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 22x84',
      images: [
        { url: '/images/mobile-home-exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 22x84 Exterior View' },
        { url: '/images/mobile-home-interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 22x84 Interior View' }
      ]
    }
  ];

  const initializeImageData = async () => {
    setIsLoading(true);
    console.log('Starting image data initialization with actual mobile home images...');

    try {
      // First, clear existing image data to replace with actual images
      const { error: deleteError } = await supabase
        .from('mobile_home_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all existing images

      if (deleteError) {
        console.error('Error clearing existing images:', deleteError);
      } else {
        console.log('Cleared existing image data');
      }

      // Get all mobile homes
      const { data: mobileHomes, error: homesError } = await supabase
        .from('mobile_homes')
        .select('id, model')
        .eq('active', true);

      if (homesError) {
        console.error('Error fetching mobile homes:', homesError);
        throw homesError;
      }

      console.log('Found mobile homes:', mobileHomes?.length || 0);

      // Insert images for each home
      let totalInserted = 0;
      for (const home of mobileHomes || []) {
        const homeImageData = imageData.find(data => data.mobile_home_model === home.model);
        
        if (homeImageData) {
          const imagesToInsert = homeImageData.images.map(img => ({
            mobile_home_id: home.id,
            image_url: img.url,
            image_type: img.type,
            display_order: img.display_order,
            alt_text: img.alt_text
          }));

          console.log(`Inserting ${imagesToInsert.length} actual images for ${home.model}`);

          const { data: insertedData, error: insertError } = await supabase
            .from('mobile_home_images')
            .insert(imagesToInsert)
            .select();

          if (insertError) {
            console.error(`Error inserting images for ${home.model}:`, insertError);
          } else {
            console.log(`Successfully inserted ${insertedData?.length || 0} actual images for ${home.model}`);
            totalInserted += insertedData?.length || 0;
          }
        } else {
          console.log(`No image data found for model: ${home.model}`);
        }
      }

      console.log(`Image data initialization completed. Total actual images inserted: ${totalInserted}`);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing image data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initializeImageData();
    }
  }, [isInitialized, isLoading]);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-2 bg-blue-50 rounded border">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading actual mobile home images...</span>
        </div>
      </div>
    );
  }

  return null;
};
