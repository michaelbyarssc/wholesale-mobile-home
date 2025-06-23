
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

  // Using placeholder images that will actually load
  const imageData: ImageData[] = [
    {
      mobile_home_model: 'Tru MH 14x56',
      images: [
        { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x56 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x56 Interior View' },
        { url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x56 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x60',
      images: [
        { url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x60 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x60 Interior View' },
        { url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x60 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x66',
      images: [
        { url: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x66 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1562182384-5a9f8a3a4a50?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x66 Interior View' },
        { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x66 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x70',
      images: [
        { url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 14x70 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 14x70 Interior View' },
        { url: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 14x70 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x76',
      images: [
        { url: 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 16x76 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 16x76 Interior View' },
        { url: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 16x76 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x80',
      images: [
        { url: 'https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 16x80 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1582063289852-62e3ba2747f8?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 16x80 Interior View' },
        { url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 16x80 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x76',
      images: [
        { url: 'https://images.unsplash.com/photo-1592595896551-12b371d546d5?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x76 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x76 Interior View' },
        { url: 'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 18x76 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x80',
      images: [
        { url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x80 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x80 Interior View' },
        { url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 18x80 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x84',
      images: [
        { url: 'https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 18x84 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 18x84 Interior View' },
        { url: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 18x84 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x76',
      images: [
        { url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x76 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1543373014-cfe4f4bc1cdf?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x76 Interior View' },
        { url: 'https://images.unsplash.com/photo-1581404917879-264f9763b263?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 20x76 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x80',
      images: [
        { url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x80 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x80 Interior View' },
        { url: 'https://images.unsplash.com/photo-1459767129954-1b1c1f9b9ace?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 20x80 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x84',
      images: [
        { url: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 20x84 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1562182384-5a9f8a3a4a50?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 20x84 Interior View' },
        { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 20x84 Floor Plan' }
      ]
    },
    {
      mobile_home_model: 'Tru MH 22x84',
      images: [
        { url: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=800&q=80', type: 'exterior', display_order: 1, alt_text: 'Tru MH 22x84 Exterior View' },
        { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80', type: 'interior', display_order: 1, alt_text: 'Tru MH 22x84 Interior View' },
        { url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=800&q=80', type: 'floorplan', display_order: 1, alt_text: 'Tru MH 22x84 Floor Plan' }
      ]
    }
  ];

  const initializeImageData = async () => {
    setIsLoading(true);
    console.log('Starting image data initialization...');

    try {
      // First, clear existing image data to replace with working URLs
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

          console.log(`Inserting ${imagesToInsert.length} images for ${home.model}`);

          const { data: insertedData, error: insertError } = await supabase
            .from('mobile_home_images')
            .insert(imagesToInsert)
            .select();

          if (insertError) {
            console.error(`Error inserting images for ${home.model}:`, insertError);
          } else {
            console.log(`Successfully inserted ${insertedData?.length || 0} images for ${home.model}`);
            totalInserted += insertedData?.length || 0;
          }
        } else {
          console.log(`No image data found for model: ${home.model}`);
        }
      }

      console.log(`Image data initialization completed. Total images inserted: ${totalInserted}`);
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
          <span>Updating image data...</span>
        </div>
      </div>
    );
  }

  return null;
};
