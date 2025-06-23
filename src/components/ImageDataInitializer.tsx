
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

  const imageData: ImageData[] = [
    {
      mobile_home_model: 'Tru MH 14x56',
      images: [
        { url: '/images/homes/tru-mh-14x56/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x56 Exterior View' },
        { url: '/images/homes/tru-mh-14x56/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x56 Interior View' },
        { url: '/images/homes/tru-mh-14x56/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x56 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x60',
      images: [
        { url: '/images/homes/tru-mh-14x60/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x60 Exterior View' },
        { url: '/images/homes/tru-mh-14x60/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x60 Interior View' },
        { url: '/images/homes/tru-mh-14x60/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x60 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x66',
      images: [
        { url: '/images/homes/tru-mh-14x66/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x66 Exterior View' },
        { url: '/images/homes/tru-mh-14x66/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x66 Interior View' },
        { url: '/images/homes/tru-mh-14x66/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x66 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x70',
      images: [
        { url: '/images/homes/tru-mh-14x70/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x70 Exterior View' },
        { url: '/images/homes/tru-mh-14x70/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x70 Interior View' },
        { url: '/images/homes/tru-mh-14x70/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x70 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x76',
      images: [
        { url: '/images/homes/tru-mh-16x76/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 16x76 Exterior View' },
        { url: '/images/homes/tru-mh-16x76/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 16x76 Interior View' },
        { url: '/images/homes/tru-mh-16x76/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 16x76 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x80',
      images: [
        { url: '/images/homes/tru-mh-16x80/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 16x80 Exterior View' },
        { url: '/images/homes/tru-mh-16x80/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 16x80 Interior View' },
        { url: '/images/homes/tru-mh-16x80/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 16x80 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x76',
      images: [
        { url: '/images/homes/tru-mh-18x76/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x76 Exterior View' },
        { url: '/images/homes/tru-mh-18x76/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x76 Interior View' },
        { url: '/images/homes/tru-mh-18x76/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 18x76 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x80',
      images: [
        { url: '/images/homes/tru-mh-18x80/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x80 Exterior View' },
        { url: '/images/homes/tru-mh-18x80/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x80 Interior View' },
        { url: '/images/homes/tru-mh-18x80/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 18x80 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x84',
      images: [
        { url: '/images/homes/tru-mh-18x84/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x84 Exterior View' },
        { url: '/images/homes/tru-mh-18x84/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x84 Interior View' },
        { url: '/images/homes/tru-mh-18x84/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 18x84 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x76',
      images: [
        { url: '/images/homes/tru-mh-20x76/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x76 Exterior View' },
        { url: '/images/homes/tru-mh-20x76/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x76 Interior View' },
        { url: '/images/homes/tru-mh-20x76/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 20x76 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x80',
      images: [
        { url: '/images/homes/tru-mh-20x80/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x80 Exterior View' },
        { url: '/images/homes/tru-mh-20x80/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x80 Interior View' },
        { url: '/images/homes/tru-mh-20x80/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 20x80 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x84',
      images: [
        { url: '/images/homes/tru-mh-20x84/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x84 Exterior View' },
        { url: '/images/homes/tru-mh-20x84/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x84 Interior View' },
        { url: '/images/homes/tru-mh-20x84/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 20x84 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 22x84',
      images: [
        { url: '/images/homes/tru-mh-22x84/exterior-1.jpg', type: 'exterior', display_order: 1, alt_text: 'Tru MH 22x84 Exterior View' },
        { url: '/images/homes/tru-mh-22x84/interior-1.jpg', type: 'interior', display_order: 1, alt_text: 'Tru MH 22x84 Interior View' },
        { url: '/images/homes/tru-mh-22x84/floorplan-1.jpg', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 22x84 Floor Plan' }
      ]
    }
  ];

  const initializeImageData = async () => {
    setIsLoading(true);
    console.log('Starting image data initialization...');

    try {
      // First, get all mobile homes
      const { data: mobileHomes, error: homesError } = await supabase
        .from('mobile_homes')
        .select('id, model')
        .eq('active', true);

      if (homesError) throw homesError;

      // Check if images already exist
      const { data: existingImages, error: existingError } = await supabase
        .from('mobile_home_images')
        .select('mobile_home_id');

      if (existingError) throw existingError;

      if (existingImages && existingImages.length > 0) {
        console.log('Images already exist in database');
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      // Insert images for each home
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

          const { error: insertError } = await supabase
            .from('mobile_home_images')
            .insert(imagesToInsert);

          if (insertError) {
            console.error(`Error inserting images for ${home.model}:`, insertError);
          } else {
            console.log(`Successfully inserted images for ${home.model}`);
          }
        }
      }

      setIsInitialized(true);
      console.log('Image data initialization completed');
    } catch (error) {
      console.error('Error initializing image data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeImageData();
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 p-2">
        Initializing image data...
      </div>
    );
  }

  return null;
};
