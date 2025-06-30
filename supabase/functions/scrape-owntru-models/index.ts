import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MobileHomeData {
  series: string;
  model: string;
  display_name: string;
  description?: string;
  square_footage?: number;
  bedrooms?: number;
  bathrooms?: number;
  length_feet?: number;
  width_feet?: number;
  features?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting OwnTru models scraping with improved patterns...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !firecrawlApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit: 9 requests per minute = 1 request every 6.67 seconds
    // Using 7 seconds to be safe
    const DELAY_BETWEEN_REQUESTS = 7000;

    // Specific model URLs that we know exist
    const modelUrls = [
      'https://owntru.com/models/tru16763ah', // BLISS
      'https://owntru.com/models/tru14623ah', // DELIGHT
      'https://owntru.com/models/trs14663ah', // ELATION
      'https://owntru.com/models/trs14763bh', // GLORY
      'https://owntru.com/models/trs14764ah', // GRAND
      'https://owntru.com/models/trs16763eh', // SENSATION
      'https://owntru.com/models/trs16763zh', // SPLENDOR
      'https://owntru.com/models/tru28483rh'  // SATISFACTION
    ];

    console.log(`Processing ${modelUrls.length} specific model URLs`);

    const mobileHomes: MobileHomeData[] = [];
    
    // Process each model URL with proper rate limiting
    for (let i = 0; i < modelUrls.length; i++) {
      const modelUrl = modelUrls[i];
      
      try {
        console.log(`[${i + 1}/${modelUrls.length}] Processing: ${modelUrl}`);
        
        // Wait between requests to respect rate limit (except for first request)
        if (i > 0) {
          console.log(`Waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds for rate limit...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
        
        const modelResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: modelUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            waitFor: 5000,
            timeout: 30000,
            removeBase64Images: true,
            actions: [{
              type: 'wait',
              milliseconds: 3000
            }]
          })
        });

        if (!modelResponse.ok) {
          const errorText = await modelResponse.text();
          console.error(`Failed to scrape ${modelUrl} (${modelResponse.status}):`, errorText);
          continue;
        }

        const modelData = await modelResponse.json();
        if (!modelData.success) {
          console.error(`Model scrape error for ${modelUrl}:`, modelData);
          continue;
        }

        const content = modelData.data?.markdown || '';
        const htmlContent = modelData.data?.html || '';
        console.log(`Raw content length for ${modelUrl}: ${content.length} chars`);
        console.log(`Sample content:`, content.substring(0, 1000));
        
        if (content.length < 100) {
          console.log(`Insufficient content for ${modelUrl}, skipping`);
          continue;
        }

        // Extract model name from URL
        const urlParts = modelUrl.split('/');
        const urlSlug = urlParts[urlParts.length - 1];
        
        const homeData: MobileHomeData = {
          series: 'OwnTru',
          model: urlSlug,
          display_name: urlSlug.toUpperCase(),
        };

        // Primary pattern: "TRU28684R // 4 beds // 2 baths // 1,791 sq. ft. // 28x68"
        const primaryPattern = /([A-Z]{3}\d{5}[A-Z])\s*\/\/\s*(\d+)\s*beds?\s*\/\/\s*(\d+(?:\.\d+)?)\s*baths?\s*\/\/\s*([\d,]+)\s*sq\.?\s*ft\.?\s*\/\/\s*(\d+)x(\d+)/gi;
        
        let primaryMatch = primaryPattern.exec(content);
        console.log(`Testing primary pattern - found match:`, primaryMatch);
        
        if (primaryMatch) {
          homeData.display_name = primaryMatch[1];
          homeData.model = primaryMatch[1];
          homeData.bedrooms = parseInt(primaryMatch[2]);
          homeData.bathrooms = parseFloat(primaryMatch[3]);
          homeData.square_footage = parseInt(primaryMatch[4].replace(/,/g, ''));
          homeData.width_feet = parseInt(primaryMatch[5]);
          homeData.length_feet = parseInt(primaryMatch[6]);
          
          console.log(`Extracted from primary pattern:`, {
            model: homeData.model,
            beds: homeData.bedrooms,
            baths: homeData.bathrooms,
            sqft: homeData.square_footage,
            dimensions: `${homeData.width_feet}x${homeData.length_feet}`
          });
        } else {
          console.log('Primary pattern failed, trying alternative patterns...');
          
          // Alternative patterns for individual extraction
          const bedroomMatches = content.match(/(\d+)\s*(?:bed|BR)(?:room)?s?\b/gi);
          if (bedroomMatches) {
            for (const match of bedroomMatches) {
              const beds = parseInt(match.match(/\d+/)?.[0] || '0');
              if (beds >= 1 && beds <= 6) {
                homeData.bedrooms = beds;
                console.log(`Found bedrooms: ${beds}`);
                break;
              }
            }
          }

          const bathroomMatches = content.match(/(\d+(?:\.\d+)?)\s*(?:bath|BA)(?:room)?s?\b/gi);
          if (bathroomMatches) {
            for (const match of bathroomMatches) {
              const baths = parseFloat(match.match(/\d+(?:\.\d+)?/)?.[0] || '0');
              if (baths >= 0.5 && baths <= 5) {
                homeData.bathrooms = baths;
                console.log(`Found bathrooms: ${baths}`);
                break;
              }
            }
          }

          const sqftMatches = content.match(/([\d,]+)\s*sq\.?\s*ft\.?\b/gi);
          if (sqftMatches) {
            for (const match of sqftMatches) {
              const sqft = parseInt(match.replace(/[^\d]/g, ''));
              if (sqft >= 500 && sqft <= 3000) {
                homeData.square_footage = sqft;
                console.log(`Found square footage: ${sqft}`);
                break;
              }
            }
          }

          const dimensionMatches = content.match(/(\d{2})\s*[x×]\s*(\d{2})/gi);
          if (dimensionMatches) {
            for (const match of dimensionMatches) {
              const parts = match.split(/[x×]/);
              const dim1 = parseInt(parts[0]?.trim() || '0');
              const dim2 = parseInt(parts[1]?.trim() || '0');
              if (dim1 >= 12 && dim1 <= 32 && dim2 >= 40 && dim2 <= 90) {
                homeData.width_feet = dim1;
                homeData.length_feet = dim2;
                console.log(`Found dimensions: ${dim1}x${dim2}`);
                break;
              }
            }
          }
        }

        // Extract model name/title from headings
        const titleMatches = content.match(/(?:^|\n)#+\s*([A-Z][A-Z\s]{2,20})\s*$/gm);
        if (titleMatches) {
          for (const match of titleMatches) {
            const title = match.replace(/#+\s*/, '').trim();
            if (title.length >= 3 && title.length <= 20 && 
                !title.includes('OWNTRU') && 
                !title.includes('HOME') &&
                !title.includes('MOBILE') &&
                !title.includes('NAVIGATION')) {
              homeData.display_name = title;
              console.log(`Found title from heading: ${title}`);
              break;
            }
          }
        }

        // Extract description - look for meaningful paragraphs
        const contentLines = content.split('\n');
        let bestDescription = '';
        
        for (const line of contentLines) {
          const cleanLine = line.trim().replace(/[#*\[\]]/g, '');
          
          if (cleanLine.length >= 50 && cleanLine.length <= 300 &&
              !cleanLine.toLowerCase().includes('owntru.com') &&
              !cleanLine.toLowerCase().includes('navigation') &&
              !cleanLine.toLowerCase().includes('cookie') &&
              !cleanLine.toLowerCase().includes('footer') &&
              !cleanLine.toLowerCase().includes('header') &&
              !cleanLine.includes('//') &&
              cleanLine.match(/[a-z]/) &&
              cleanLine.split(' ').length >= 8) {
            bestDescription = cleanLine;
            console.log(`Found description: ${cleanLine.substring(0, 100)}...`);
            break;
          }
        }
        
        if (bestDescription) {
          homeData.description = bestDescription;
        }

        // Extract features - look for actual home features, not navigation
        const features: string[] = [];
        const featureKeywords = [
          'kitchen', 'cabinet', 'counter', 'appliance', 'island', 'pantry',
          'bathroom', 'shower', 'tub', 'vanity', 'toilet', 'master',
          'bedroom', 'closet', 'storage', 'room', 'living', 'dining',
          'flooring', 'vinyl', 'carpet', 'tile', 'wood', 'laminate',
          'window', 'door', 'ceiling', 'wall', 'paint', 'trim',
          'electric', 'plumbing', 'heating', 'cooling', 'insulation', 'energy'
        ];

        // Look for bullet points or list items that contain feature keywords
        const bulletRegex = /^[\s\*\-•]\s*(.+)$/gm;
        let bulletMatch;
        
        while ((bulletMatch = bulletRegex.exec(content)) !== null && features.length < 10) {
          let feature = bulletMatch[1].trim();
          feature = feature.replace(/\[.*?\]/g, '').trim(); // Remove markdown links
          
          const hasRelevantKeyword = featureKeywords.some(keyword => 
            feature.toLowerCase().includes(keyword)
          );
          
          if (hasRelevantKeyword && 
              feature.length >= 10 && feature.length <= 100 &&
              !feature.toLowerCase().includes('owntru') &&
              !feature.toLowerCase().includes('http') &&
              !feature.toLowerCase().includes('navigation') &&
              !feature.toLowerCase().includes('footer') &&
              !feature.toLowerCase().includes('menu') &&
              !features.includes(feature)) {
            features.push(feature);
            console.log(`Found feature: ${feature}`);
          }
        }

        if (features.length > 0) {
          homeData.features = features;
        }

        mobileHomes.push(homeData);
        console.log(`Successfully processed: ${homeData.display_name}`);
        console.log('Final data summary:', {
          name: homeData.display_name,
          model: homeData.model,
          sqft: homeData.square_footage,
          bed: homeData.bedrooms,
          bath: homeData.bathrooms,
          dimensions: homeData.length_feet && homeData.width_feet ? 
            `${homeData.width_feet}x${homeData.length_feet}` : null,
          features: homeData.features?.length || 0,
          hasDescription: !!homeData.description
        });

      } catch (error) {
        console.error(`Error processing ${modelUrl}:`, error);
        continue;
      }
    }

    console.log(`Successfully extracted ${mobileHomes.length} mobile homes`);

    // Update database
    let updatedCount = 0;
    let createdCount = 0;

    for (const homeData of mobileHomes) {
      try {
        const { data: existingHome } = await supabase
          .from('mobile_homes')
          .select('id')
          .or(`display_name.ilike.%${homeData.display_name}%,model.ilike.%${homeData.model}%`)
          .maybeSingle();

        if (existingHome) {
          const { error } = await supabase
            .from('mobile_homes')
            .update({
              series: homeData.series,
              model: homeData.model,
              display_name: homeData.display_name,
              description: homeData.description,
              square_footage: homeData.square_footage,
              bedrooms: homeData.bedrooms,
              bathrooms: homeData.bathrooms,
              length_feet: homeData.length_feet,
              width_feet: homeData.width_feet,
              features: homeData.features ? JSON.stringify(homeData.features) : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingHome.id);

          if (!error) {
            updatedCount++;
            console.log(`Updated: ${homeData.display_name}`);
          } else {
            console.error(`Update error for ${homeData.display_name}:`, error);
          }
        } else {
          const { data: maxOrder } = await supabase
            .from('mobile_homes')
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1);

          const nextOrder = (maxOrder?.[0]?.display_order || 0) + 1;

          const { error } = await supabase
            .from('mobile_homes')
            .insert({
              manufacturer: 'OwnTru',
              series: homeData.series,
              model: homeData.model,
              display_name: homeData.display_name,
              description: homeData.description,
              square_footage: homeData.square_footage,
              bedrooms: homeData.bedrooms,
              bathrooms: homeData.bathrooms,
              length_feet: homeData.length_feet,
              width_feet: homeData.width_feet,
              features: homeData.features ? JSON.stringify(homeData.features) : null,
              price: 0,
              minimum_profit: 0,
              display_order: nextOrder,
              active: true,
            });

          if (!error) {
            createdCount++;
            console.log(`Created: ${homeData.display_name}`);
          } else {
            console.error(`Insert error for ${homeData.display_name}:`, error);
          }
        }
      } catch (error) {
        console.error(`Database error for ${homeData.display_name}:`, error);
      }
    }

    const result = {
      success: true,
      message: `Successfully processed ${mobileHomes.length} mobile homes. Created: ${createdCount}, Updated: ${updatedCount}`,
      data: {
        totalProcessed: mobileHomes.length,
        created: createdCount,
        updated: updatedCount,
        homes: mobileHomes.map(h => ({
          display_name: h.display_name,
          model: h.model,
          square_footage: h.square_footage,
          bedrooms: h.bedrooms,
          bathrooms: h.bathrooms,
          dimensions: h.length_feet && h.width_feet ? `${h.width_feet}x${h.length_feet}` : null,
          features_count: h.features?.length || 0,
          description: h.description ? h.description.substring(0, 100) + '...' : null
        }))
      }
    };

    console.log('Scraping completed:', result.message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Scraping error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to scrape OwnTru models'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
