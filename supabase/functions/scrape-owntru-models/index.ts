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

        // Look for patterns like "TRU28684R // 4 beds // 2 baths // 1,791 sq. ft. // 28x68"
        const specPatterns = [
          // Pattern: "TRU28684R // 4 beds // 2 baths // 1,791 sq. ft. // 28x68"
          /([A-Z]{3}\d{5}[A-Z])\s*\/\/\s*(\d+)\s*beds?\s*\/\/\s*(\d+(?:\.\d+)?)\s*baths?\s*\/\/\s*([\d,]+)\s*sq\.?\s*ft\.?\s*\/\/\s*(\d+)x(\d+)/gi,
          // Alternative patterns
          /(\d+)\s*bed[s]?\s*[\/\-\|]\s*(\d+(?:\.\d+)?)\s*bath[s]?\s*[\/\-\|]\s*([\d,]+)\s*sq\.?\s*ft\.?\s*[\/\-\|]\s*(\d+)\s*[x×]\s*(\d+)/gi,
          /(\d+)\s*BR\s*[\/\-\|]\s*(\d+(?:\.\d+)?)\s*BA\s*[\/\-\|]\s*([\d,]+)\s*SF\s*[\/\-\|]\s*(\d+)\s*[x×]\s*(\d+)/gi,
        ];

        let specFound = false;

        for (const pattern of specPatterns) {
          const matches = [...content.matchAll(pattern)];
          console.log(`Testing pattern ${pattern.source} - found ${matches.length} matches`);
          
          for (const match of matches) {
            console.log(`Match found:`, match);
            
            if (pattern.source.includes('([A-Z]{3}\\d{5}[A-Z])')) {
              // Full pattern match: TRU28684R // 4 beds // 2 baths // 1,791 sq. ft. // 28x68
              if (match[1]) homeData.display_name = match[1];
              if (match[2]) homeData.bedrooms = parseInt(match[2]);
              if (match[3]) homeData.bathrooms = parseFloat(match[3]);
              if (match[4]) homeData.square_footage = parseInt(match[4].replace(/,/g, ''));
              if (match[5] && match[6]) {
                homeData.width_feet = parseInt(match[5]);
                homeData.length_feet = parseInt(match[6]);
              }
            } else {
              // Other patterns
              if (match[1]) homeData.bedrooms = parseInt(match[1]);
              if (match[2]) homeData.bathrooms = parseFloat(match[2]);
              if (match[3]) homeData.square_footage = parseInt(match[3].replace(/,/g, ''));
              if (match[4] && match[5]) {
                homeData.width_feet = parseInt(match[4]);
                homeData.length_feet = parseInt(match[5]);
              }
            }
            
            specFound = true;
            console.log(`Extracted specs:`, {
              beds: homeData.bedrooms,
              baths: homeData.bathrooms,
              sqft: homeData.square_footage,
              dimensions: `${homeData.width_feet}x${homeData.length_feet}`
            });
            break;
          }
          
          if (specFound) break;
        }

        // If main pattern didn't work, try individual extraction
        if (!homeData.bedrooms || !homeData.bathrooms || !homeData.square_footage) {
          console.log('Main pattern failed, trying individual extraction...');
          
          // Extract bedrooms
          const bedroomPatterns = [
            /(\d+)\s*(?:bed|BR)(?:room)?s?\b/gi,
            /bed(?:room)?s?[\s:]*(\d+)/gi,
          ];

          for (const pattern of bedroomPatterns) {
            const matches = [...content.matchAll(pattern)];
            for (const match of matches) {
              const beds = parseInt(match[1]);
              if (beds >= 1 && beds <= 6) {
                homeData.bedrooms = beds;
                console.log(`Found bedrooms: ${beds}`);
                break;
              }
            }
            if (homeData.bedrooms) break;
          }

          // Extract bathrooms
          const bathroomPatterns = [
            /(\d+(?:\.\d+)?)\s*(?:bath|BA)(?:room)?s?\b/gi,
            /bath(?:room)?s?[\s:]*(\d+(?:\.\d+)?)/gi,
          ];

          for (const pattern of bathroomPatterns) {
            const matches = [...content.matchAll(pattern)];
            for (const match of matches) {
              const baths = parseFloat(match[1]);
              if (baths >= 0.5 && baths <= 5) {
                homeData.bathrooms = baths;
                console.log(`Found bathrooms: ${baths}`);
                break;
              }
            }
            if (homeData.bathrooms) break;
          }

          // Extract square footage
          const sqftPatterns = [
            /([\d,]+)\s*sq\.?\s*ft\.?\b/gi,
            /sq\.?\s*ft\.?[\s:]*(\d{3,4})/gi,
            /(1,?\d{3})\s*SF\b/gi,
          ];

          for (const pattern of sqftPatterns) {
            const matches = [...content.matchAll(pattern)];
            for (const match of matches) {
              const sqft = parseInt(match[1].replace(/,/g, ''));
              if (sqft >= 500 && sqft <= 3000) {
                homeData.square_footage = sqft;
                console.log(`Found square footage: ${sqft}`);
                break;
              }
            }
            if (homeData.square_footage) break;
          }

          // Extract dimensions
          const dimensionPatterns = [
            /(\d{2})\s*[x×]\s*(\d{2})/gi,
            /(\d{2})\s*[′']\s*[x×]\s*(\d{2})\s*[′']/gi,
          ];

          for (const pattern of dimensionPatterns) {
            const matches = [...content.matchAll(pattern)];
            for (const match of matches) {
              const dim1 = parseInt(match[1]);
              const dim2 = parseInt(match[2]);
              if (dim1 >= 12 && dim1 <= 32 && dim2 >= 40 && dim2 <= 90) {
                homeData.width_feet = dim1;
                homeData.length_feet = dim2;
                console.log(`Found dimensions: ${dim1}x${dim2}`);
                break;
              }
            }
            if (homeData.width_feet && homeData.length_feet) break;
          }
        }

        // Extract model name/title
        const titlePatterns = [
          /(?:^|\n)#\s*([A-Z][A-Z\s]{2,20})\s*$/gm,
          /\*\*([A-Z][A-Z\s]{3,20})\*\*/g,
          /([A-Z]{3}\d{5}[A-Z])/g,
        ];

        for (const pattern of titlePatterns) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            const title = match[1].trim();
            if (title.length >= 3 && title.length <= 20 && 
                !title.includes('OWNTRU') && 
                !title.includes('HOME') &&
                !title.includes('MOBILE')) {
              homeData.display_name = title;
              homeData.model = title.replace(/\s+/g, '');
              console.log(`Found title: ${title}`);
              break;
            }
          }
          if (homeData.display_name !== urlSlug.toUpperCase()) break;
        }

        // Extract description - look for meaningful paragraphs
        const contentLines = content.split('\n');
        let bestDescription = '';
        
        for (const line of contentLines) {
          const cleanLine = line.trim().replace(/[#*\[\]]/g, '');
          
          if (cleanLine.length >= 100 && cleanLine.length <= 500 &&
              !cleanLine.toLowerCase().includes('owntru.com') &&
              !cleanLine.toLowerCase().includes('navigation') &&
              !cleanLine.toLowerCase().includes('cookie') &&
              !cleanLine.includes('//') &&
              cleanLine.match(/[a-z]/) &&
              cleanLine.split(' ').length >= 15) {
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
          'kitchen', 'cabinet', 'counter', 'appliance', 'island',
          'bathroom', 'shower', 'tub', 'vanity', 'toilet',
          'bedroom', 'closet', 'storage', 'room',
          'flooring', 'vinyl', 'carpet', 'tile', 'wood',
          'window', 'door', 'ceiling', 'wall', 'paint',
          'electric', 'plumbing', 'heating', 'cooling', 'insulation'
        ];

        for (const line of contentLines) {
          if ((line.startsWith('*') || line.startsWith('-') || line.startsWith('•')) && 
              line.length >= 20 && line.length <= 120) {
            
            let feature = line.replace(/^[\*\-•]\s*/, '').trim();
            feature = feature.replace(/\[.*?\]/g, '').trim();
            
            const hasRelevantKeyword = featureKeywords.some(keyword => 
              feature.toLowerCase().includes(keyword)
            );
            
            if (hasRelevantKeyword && 
                !feature.toLowerCase().includes('owntru') &&
                !feature.toLowerCase().includes('http') &&
                !feature.toLowerCase().includes('navigation') &&
                !features.includes(feature)) {
              features.push(feature);
              console.log(`Found feature: ${feature}`);
            }
          }
          
          if (features.length >= 10) break;
        }

        if (features.length > 0) {
          homeData.features = features;
        }

        mobileHomes.push(homeData);
        console.log(`Successfully processed: ${homeData.display_name}`);
        console.log('Final data summary:', {
          name: homeData.display_name,
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
