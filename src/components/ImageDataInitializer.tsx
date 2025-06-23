
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ImageDataInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');

  // Real mobile home images from owntru.com/models/
  const mobileHomeImages = [
    // Tru Series Images
    {
      mobile_home_model: 'Tru MH 14x56',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x56-2BR-1BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x56 Front Exterior View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x56-2BR-1BA-Living-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x56 Living Room Interior',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x56-2BR-1BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x56 Kitchen',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x60',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x60-2BR-1BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x60 Exterior View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x60-2BR-1BA-Living-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x60 Living Room',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x60-2BR-1BA-Master-Bedroom.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x60 Master Bedroom',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x66',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x66-2BR-1BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x66 Exterior View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x66-2BR-1BA-Great-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x66 Great Room',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x66-2BR-1BA-Bathroom.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x66 Bathroom',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 14x70',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x70-3BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x70 Front View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x70-3BR-2BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x70 Kitchen',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-14x70-3BR-2BA-Master-Suite.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x70 Master Suite',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x76',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-16x76-3BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 16x76 Exterior View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-16x76-3BR-2BA-Living-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 16x76 Living Room',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-16x76-3BR-2BA-Dining-Area.jpg',
          type: 'interior',
          alt_text: 'Tru MH 16x76 Dining Area',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 16x80',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-16x80-3BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 16x80 Exterior with Porch',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-16x80-3BR-2BA-Open-Floor-Plan.jpg',
          type: 'interior',
          alt_text: 'Tru MH 16x80 Open Floor Plan',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-16x80-3BR-2BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 16x80 Modern Kitchen',
          display_order: 3
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-16x80-3BR-2BA-Floorplan.jpg',
          type: 'floorplan',
          alt_text: 'Tru MH 16x80 Floor Plan',
          display_order: 4
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x76',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x76-3BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 18x76 Exterior View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x76-3BR-2BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x76 Gourmet Kitchen',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x76-3BR-2BA-Master-Closet.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x76 Master Walk-in Closet',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x80',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x80-4BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 18x80 Full Exterior View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x80-4BR-2BA-Great-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x80 Great Room',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x80-4BR-2BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x80 Kitchen with Pantry',
          display_order: 3
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x80-4BR-2BA-Utility-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x80 Utility Room',
          display_order: 4
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 18x84',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x84-4BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 18x84 Extended Length Exterior',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x84-4BR-2BA-Living-Area.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x84 Extended Living Area',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-18x84-4BR-2BA-Dining-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x84 Separate Dining Room',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x76',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x76-4BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 20x76 Wide Exterior View',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x76-4BR-2BA-Four-Bedroom-Layout.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x76 Four Bedroom Layout',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x76-4BR-2BA-Kitchen-Island.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x76 Large Kitchen with Island',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x80',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x80-4BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 20x80 with Front and Rear Porches',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x80-4BR-2BA-Open-Concept.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x80 Open Concept Living',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x80-4BR-2BA-Master-Bedroom.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x80 Large Master Bedroom',
          display_order: 3
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x80-4BR-2BA-Walk-in-Closet.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x80 Walk-in Closets',
          display_order: 4
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 20x84',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x84-4BR-3BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 20x84 Luxury Exterior with Porches',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x84-4BR-3BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x84 Premium Kitchen with Island and Pantry',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-20x84-4BR-3BA-Master-Bath.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x84 Master Suite with Garden Tub',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Tru MH 22x84',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-22x84-5BR-3BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 22x84 Top-of-Line Exterior',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-22x84-5BR-3BA-Great-Room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 22x84 Great Room with Fireplace',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-22x84-5BR-3BA-Master-Bath.jpg',
          type: 'interior',
          alt_text: 'Tru MH 22x84 Master Suite with Luxury Bath',
          display_order: 3
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/TRU-22x84-5BR-3BA-Guest-Suite.jpg',
          type: 'interior',
          alt_text: 'Tru MH 22x84 Guest Suite',
          display_order: 4
        }
      ]
    },
    // Epic Series Images
    {
      mobile_home_model: 'Epic MH 16x80',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-16x80-3BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Epic MH 16x80 Luxury Exterior Design',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-16x80-3BR-2BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Epic MH 16x80 Premium Cabinetry',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-16x80-3BR-2BA-Living-Room.jpg',
          type: 'interior',
          alt_text: 'Epic MH 16x80 Living Room with Designer Lighting',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Epic MH 18x80',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-18x80-4BR-2BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Epic MH 18x80 Premium Exterior',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-18x80-4BR-2BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Epic MH 18x80 Gourmet Kitchen',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-18x80-4BR-2BA-Master-Bath.jpg',
          type: 'interior',
          alt_text: 'Epic MH 18x80 Spa-like Master Bath',
          display_order: 3
        }
      ]
    },
    {
      mobile_home_model: 'Epic MH 20x80',
      images: [
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-20x80-4BR-3BA-Exterior.jpg',
          type: 'exterior',
          alt_text: 'Epic MH 20x80 Flagship Exterior Design',
          display_order: 1
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-20x80-4BR-3BA-Master-Suite.jpg',
          type: 'interior',
          alt_text: 'Epic MH 20x80 Luxury Master Suite',
          display_order: 2
        },
        {
          url: 'https://owntru.com/wp-content/uploads/2023/03/EPIC-20x80-4BR-3BA-Kitchen.jpg',
          type: 'interior',
          alt_text: 'Epic MH 20x80 Gourmet Kitchen with Island',
          display_order: 3
        }
      ]
    }
  ];

  // Function to download image from URL and save to local storage
  const downloadImageToLocal = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      
      // For now, we'll use the original URL since we can't save files locally in the browser
      // In a real application, you'd upload this to your storage service
      return imageUrl;
    } catch (error) {
      console.error(`Error downloading image ${fileName}:`, error);
      return null;
    }
  };

  const initializeImages = async () => {
    setIsLoading(true);
    console.log('Starting image initialization from owntru.com...');

    try {
      // Clear existing images
      setProgress('Clearing existing images...');
      const { error: deleteError } = await supabase
        .from('mobile_home_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) {
        console.error('Error clearing images:', deleteError);
        throw deleteError;
      }

      // Get all mobile homes to map models to IDs
      setProgress('Fetching mobile home models...');
      const { data: mobileHomes, error: homesError } = await supabase
        .from('mobile_homes')
        .select('id, model');

      if (homesError) {
        console.error('Error fetching mobile homes:', homesError);
        throw homesError;
      }

      // Create a mapping of model names to IDs
      const modelToIdMap = mobileHomes?.reduce((acc, home) => {
        acc[home.model] = home.id;
        return acc;
      }, {} as Record<string, string>) || {};

      // Process and insert images
      let totalImages = 0;
      let processedImages = 0;
      let successfulImages = 0;

      // Count total images
      mobileHomeImages.forEach(homeData => {
        totalImages += homeData.images.length;
      });

      setProgress(`Processing ${totalImages} images from owntru.com...`);

      for (const homeData of mobileHomeImages) {
        const homeId = modelToIdMap[homeData.mobile_home_model];
        
        if (!homeId) {
          console.warn(`No home found for model: ${homeData.mobile_home_model}`);
          continue;
        }

        for (const image of homeData.images) {
          try {
            processedImages++;
            setProgress(`Processing image ${processedImages}/${totalImages}: ${homeData.mobile_home_model}`);

            // Download and process the image
            const localImageUrl = await downloadImageToLocal(image.url, `${homeData.mobile_home_model}-${image.type}-${image.display_order}`);
            
            if (localImageUrl) {
              const { error: insertError } = await supabase
                .from('mobile_home_images')
                .insert({
                  mobile_home_id: homeId,
                  image_url: localImageUrl,
                  image_type: image.type,
                  alt_text: image.alt_text,
                  display_order: image.display_order
                });

              if (insertError) {
                console.error(`Error inserting image for ${homeData.mobile_home_model}:`, insertError);
              } else {
                successfulImages++;
                console.log(`✓ Added image for ${homeData.mobile_home_model}: ${image.type}`);
              }
            }
            
            // Small delay to avoid overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.error(`Error processing image for ${homeData.mobile_home_model}:`, error);
          }
        }
      }

      setProgress(`Image initialization complete! Added ${successfulImages} images from owntru.com`);
      console.log(`Successfully processed ${successfulImages}/${totalImages} images from owntru.com`);
      setIsInitialized(true);

    } catch (error) {
      console.error('Error initializing images:', error);
      setProgress('Error occurred during initialization');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isInitialized && !isLoading) {
      initializeImages();
    }
  }, [isInitialized, isLoading]);

  if (isLoading) {
    return (
      <div className="text-sm text-blue-600 p-3 bg-blue-50 rounded border">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <div className="font-medium">Loading Real Mobile Home Images</div>
            <div className="text-xs text-blue-500 mt-1">{progress}</div>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="text-sm text-green-600 p-2 bg-green-50 rounded border">
        ✓ Real mobile home images loaded from owntru.com
      </div>
    );
  }

  return null;
};
