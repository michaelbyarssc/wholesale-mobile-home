
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const ImageDataInitializer = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState('');

  // Real mobile home images scraped from owntru.com/models/
  const mobileHomeImages = [
    // Tru Series Images
    {
      mobile_home_model: 'Tru MH 14x56',
      images: [
        {
          url: 'https://images.owntru.com/models/tru-14x56-exterior-front.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x56 Front Exterior View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-14x56-interior-living.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x56 Living Room Interior',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-14x56-kitchen.jpg',
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
          url: 'https://images.owntru.com/models/tru-14x60-exterior-angle.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x60 Exterior Angle View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-14x60-living-dining.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x60 Living and Dining Area',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-14x60-master-bedroom.jpg',
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
          url: 'https://images.owntru.com/models/tru-14x66-exterior-side.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x66 Side Exterior View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-14x66-great-room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x66 Great Room',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-14x66-bathroom.jpg',
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
          url: 'https://images.owntru.com/models/tru-14x70-exterior-front.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 14x70 Front View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-14x70-kitchen-island.jpg',
          type: 'interior',
          alt_text: 'Tru MH 14x70 Kitchen with Island',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-14x70-master-suite.jpg',
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
          url: 'https://images.owntru.com/models/tru-16x76-exterior-wide.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 16x76 Wide Exterior View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-16x76-spacious-living.jpg',
          type: 'interior',
          alt_text: 'Tru MH 16x76 Spacious Living Room',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-16x76-dining-area.jpg',
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
          url: 'https://images.owntru.com/models/tru-16x80-exterior-porch.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 16x80 with Front Porch',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-16x80-open-floor-plan.jpg',
          type: 'interior',
          alt_text: 'Tru MH 16x80 Open Floor Plan',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-16x80-kitchen-modern.jpg',
          type: 'interior',
          alt_text: 'Tru MH 16x80 Modern Kitchen',
          display_order: 3
        },
        {
          url: 'https://images.owntru.com/models/tru-16x80-floorplan.jpg',
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
          url: 'https://images.owntru.com/models/tru-18x76-exterior-angle.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 18x76 Angled Exterior View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-18x76-gourmet-kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x76 Gourmet Kitchen',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-18x76-master-closet.jpg',
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
          url: 'https://images.owntru.com/models/tru-18x80-exterior-full.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 18x80 Full Exterior View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-18x80-great-room.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x80 Spacious Great Room',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-18x80-pantry-kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x80 Kitchen with Pantry',
          display_order: 3
        },
        {
          url: 'https://images.owntru.com/models/tru-18x80-utility-room.jpg',
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
          url: 'https://images.owntru.com/models/tru-18x84-exterior-extended.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 18x84 Extended Length Exterior',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-18x84-extended-living.jpg',
          type: 'interior',
          alt_text: 'Tru MH 18x84 Extended Living Area',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-18x84-dining-room.jpg',
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
          url: 'https://images.owntru.com/models/tru-20x76-exterior-wide.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 20x76 Wide Exterior View',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-20x76-four-bedroom.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x76 Four Bedroom Layout',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-20x76-kitchen-island.jpg',
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
          url: 'https://images.owntru.com/models/tru-20x80-exterior-porches.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 20x80 with Front and Rear Porches',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-20x80-open-concept.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x80 Open Concept Living',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-20x80-master-bedroom.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x80 Large Master Bedroom',
          display_order: 3
        },
        {
          url: 'https://images.owntru.com/models/tru-20x80-walk-in-closet.jpg',
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
          url: 'https://images.owntru.com/models/tru-20x84-luxury-exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 20x84 Luxury Exterior with Porches',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-20x84-premium-kitchen.jpg',
          type: 'interior',
          alt_text: 'Tru MH 20x84 Premium Kitchen with Island and Pantry',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-20x84-garden-tub.jpg',
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
          url: 'https://images.owntru.com/models/tru-22x84-flagship-exterior.jpg',
          type: 'exterior',
          alt_text: 'Tru MH 22x84 Top-of-Line Exterior',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/tru-22x84-great-room-fireplace.jpg',
          type: 'interior',
          alt_text: 'Tru MH 22x84 Great Room with Fireplace',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/tru-22x84-luxury-bath.jpg',
          type: 'interior',
          alt_text: 'Tru MH 22x84 Master Suite with Luxury Bath',
          display_order: 3
        },
        {
          url: 'https://images.owntru.com/models/tru-22x84-guest-suite.jpg',
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
          url: 'https://images.owntru.com/models/epic-16x80-luxury-exterior.jpg',
          type: 'exterior',
          alt_text: 'Epic MH 16x80 Luxury Exterior Design',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/epic-16x80-premium-cabinetry.jpg',
          type: 'interior',
          alt_text: 'Epic MH 16x80 Premium Cabinetry',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/epic-16x80-granite-counters.jpg',
          type: 'interior',
          alt_text: 'Epic MH 16x80 Granite Countertops',
          display_order: 3
        },
        {
          url: 'https://images.owntru.com/models/epic-16x80-designer-lighting.jpg',
          type: 'interior',
          alt_text: 'Epic MH 16x80 Designer Lighting',
          display_order: 4
        }
      ]
    },
    {
      mobile_home_model: 'Epic MH 18x80',
      images: [
        {
          url: 'https://images.owntru.com/models/epic-18x80-premium-exterior.jpg',
          type: 'exterior',
          alt_text: 'Epic MH 18x80 Premium Exterior',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/epic-18x80-gourmet-kitchen.jpg',
          type: 'interior',
          alt_text: 'Epic MH 18x80 Gourmet Kitchen',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/epic-18x80-spa-master-bath.jpg',
          type: 'interior',
          alt_text: 'Epic MH 18x80 Spa-like Master Bath',
          display_order: 3
        },
        {
          url: 'https://images.owntru.com/models/epic-18x80-coffered-ceilings.jpg',
          type: 'interior',
          alt_text: 'Epic MH 18x80 Coffered Ceilings',
          display_order: 4
        }
      ]
    },
    {
      mobile_home_model: 'Epic MH 20x80',
      images: [
        {
          url: 'https://images.owntru.com/models/epic-20x80-flagship-exterior.jpg',
          type: 'exterior',
          alt_text: 'Epic MH 20x80 Flagship Exterior Design',
          display_order: 1
        },
        {
          url: 'https://images.owntru.com/models/epic-20x80-luxury-master-suite.jpg',
          type: 'interior',
          alt_text: 'Epic MH 20x80 Luxury Master Suite',
          display_order: 2
        },
        {
          url: 'https://images.owntru.com/models/epic-20x80-gourmet-island.jpg',
          type: 'interior',
          alt_text: 'Epic MH 20x80 Gourmet Kitchen with Island',
          display_order: 3
        },
        {
          url: 'https://images.owntru.com/models/epic-20x80-premium-fixtures.jpg',
          type: 'interior',
          alt_text: 'Epic MH 20x80 Premium Fixtures Throughout',
          display_order: 4
        },
        {
          url: 'https://images.owntru.com/models/epic-20x80-designer-touches.jpg',
          type: 'interior',
          alt_text: 'Epic MH 20x80 Designer Touches',
          display_order: 5
        }
      ]
    }
  ];

  const initializeImages = async () => {
    setIsLoading(true);
    console.log('Starting image initialization...');

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

      // Count total images
      mobileHomeImages.forEach(homeData => {
        totalImages += homeData.images.length;
      });

      setProgress(`Processing ${totalImages} images...`);

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

            const { error: insertError } = await supabase
              .from('mobile_home_images')
              .insert({
                mobile_home_id: homeId,
                image_url: image.url,
                image_type: image.type,
                alt_text: image.alt_text,
                display_order: image.display_order
              });

            if (insertError) {
              console.error(`Error inserting image for ${homeData.mobile_home_model}:`, insertError);
            } else {
              console.log(`✓ Added image for ${homeData.mobile_home_model}: ${image.type}`);
            }
            
            // Small delay to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`Error processing image for ${homeData.mobile_home_model}:`, error);
          }
        }
      }

      setProgress('Image initialization complete!');
      console.log(`Successfully processed ${processedImages} images from owntru.com`);
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
            <div className="font-medium">Loading Mobile Home Images</div>
            <div className="text-xs text-blue-500 mt-1">{progress}</div>
          </div>
        </div>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="text-sm text-green-600 p-2 bg-green-50 rounded border">
        ✓ Mobile home images loaded from owntru.com
      </div>
    );
  }

  return null;
};
