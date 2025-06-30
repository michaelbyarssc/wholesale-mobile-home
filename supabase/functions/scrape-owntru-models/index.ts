
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
    console.log('Starting OwnTru models scraping with improved extraction...');
    
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
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000,
            timeout: 30000,
            removeBase64Images: true
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
        console.log(`Raw content length for ${modelUrl}: ${content.length} chars`);
        console.log(`First 500 chars:`, content.substring(0, 500));
        
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

        // Extract title/display name - look for main headings
        const titlePatterns = [
          /^#\s+([A-Z][A-Z\s]{2,30})\s*$/gm,
          /^##\s+([A-Z][A-Z\s]{2,30})\s*$/gm,
          /\*\*([A-Z][A-Z\s]{3,30})\*\*/g,
          /^([A-Z][A-Z\s]{3,30})$/gm
        ];

        for (const pattern of titlePatterns) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              const title = match[1].trim();
              if (title.length >= 3 && title.length <= 30 && 
                  !title.includes('OWNTRU') && 
                  !title.includes('HOME') &&
                  !title.includes('MOBILE') &&
                  title.match(/^[A-Z\s]+$/)) {
                homeData.display_name = title;
                homeData.model = title.replace(/\s+/g, '');
                console.log(`Found title: ${title}`);
                break;
              }
            }
          }
          if (homeData.display_name !== urlSlug.toUpperCase()) break;
        }

        // Extract square footage - more specific patterns
        const sqftPatterns = [
          /(\d{3,4})[\s\-]*(?:sq\.?\s*ft\.?|square[\s\-]*feet?)\b/gi,
          /(?:square[\s\-]*footage|sq\.?\s*ft\.?)[\s\:\-]*(\d{3,4})\b/gi,
          /(?:total|living)[\s\-]*(?:area|space)[\s\:\-]*(\d{3,4})[\s\-]*(?:sq|ft)/gi,
          /(\d{3,4})[\s\-]*sf\b/gi
        ];

        for (const pattern of sqftPatterns) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              const sqft = parseInt(match[1]);
              if (sqft >= 400 && sqft <= 2500) {
                homeData.square_footage = sqft;
                console.log(`Found square footage: ${sqft}`);
                break;
              }
            }
          }
          if (homeData.square_footage) break;
        }

        // Extract bedrooms and bathrooms
        const bedroomPatterns = [
          /(\d+)[\s\-]*bed(?:room)?s?\b/gi,
          /bed(?:room)?s?[\s\:\-]*(\d+)/gi,
          /(\d+)[\s\-]*br\b/gi
        ];

        for (const pattern of bedroomPatterns) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              const bedrooms = parseInt(match[1]);
              if (bedrooms >= 1 && bedrooms <= 5) {
                homeData.bedrooms = bedrooms;
                console.log(`Found bedrooms: ${bedrooms}`);
                break;
              }
            }
          }
          if (homeData.bedrooms) break;
        }

        const bathroomPatterns = [
          /(\d+(?:\.\d+)?)[\s\-]*bath(?:room)?s?\b/gi,
          /bath(?:room)?s?[\s\:\-]*(\d+(?:\.\d+)?)/gi,
          /(\d+(?:\.\d+)?)[\s\-]*ba\b/gi
        ];

        for (const pattern of bathroomPatterns) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              const bathrooms = parseFloat(match[1]);
              if (bathrooms >= 0.5 && bathrooms <= 4) {
                homeData.bathrooms = bathrooms;
                console.log(`Found bathrooms: ${bathrooms}`);
                break;
              }
            }
          }
          if (homeData.bathrooms) break;
        }

        // Extract dimensions
        const dimensionPatterns = [
          /(\d+)[\s\-]*[′'x×]\s*(\d+)[\s\-]*[′']/gi,
          /(\d+)[\s\-]*ft[\s\-]*[x×][\s\-]*(\d+)[\s\-]*ft/gi,
          /(\d+)[\s\-]*by[\s\-]*(\d+)/gi,
          /length[\s\:\-]*(\d+)[^0-9]*width[\s\:\-]*(\d+)/gi,
          /width[\s\:\-]*(\d+)[^0-9]*length[\s\:\-]*(\d+)/gi
        ];

        for (const pattern of dimensionPatterns) {
          const matches = [...content.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1] && match[2]) {
              const dim1 = parseInt(match[1]);
              const dim2 = parseInt(match[2]);
              if (dim1 >= 10 && dim1 <= 50 && dim2 >= 30 && dim2 <= 120) {
                homeData.width_feet = Math.min(dim1, dim2);
                homeData.length_feet = Math.max(dim1, dim2);
                console.log(`Found dimensions: ${homeData.width_feet}x${homeData.length_feet}`);
                break;
              }
            }
          }
          if (homeData.length_feet && homeData.width_feet) break;
        }

        // Extract description - look for substantial paragraphs
        const lines = content.split('\n');
        let bestDescription = '';
        
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j].trim();
          
          // Skip headers, navigation, and short lines
          if (line.startsWith('#') || 
              line.startsWith('*') || 
              line.length < 100 ||
              line.toLowerCase().includes('owntru.com') ||
              line.toLowerCase().includes('navigation') ||
              line.toLowerCase().includes('menu') ||
              line.toLowerCase().includes('cookie')) {
            continue;
          }
          
          // Look for descriptive content
          if (line.length >= 100 && line.length <= 800) {
            const cleanLine = line.replace(/[*#\[\]]/g, '').trim();
            if (cleanLine.length >= 100 && 
                cleanLine.split(' ').length >= 15 &&
                cleanLine.match(/[a-z]/)) {
              bestDescription = cleanLine;
              break;
            }
          }
        }
        
        if (bestDescription) {
          homeData.description = bestDescription;
          console.log(`Found description: ${bestDescription.substring(0, 100)}...`);
        }

        // Extract features - look for bullet points and feature lists
        const features: string[] = [];
        const contentLines = content.split('\n');
        
        for (let j = 0; j < contentLines.length && features.length < 15; j++) {
          const line = contentLines[j].trim();
          
          // Look for bullet points or list items
          if (line.startsWith('*') || line.startsWith('-') || line.startsWith('•')) {
            let feature = line.replace(/^[\*\-•]\s*/, '').trim();
            
            // Clean up the feature text
            feature = feature.replace(/\[.*?\]/g, '').trim();
            
            // Validate feature
            if (feature.length >= 10 && 
                feature.length <= 100 && 
                !feature.toLowerCase().includes('owntru') &&
                !feature.toLowerCase().includes('http') &&
                !feature.toLowerCase().includes('navigation') &&
                !feature.toLowerCase().includes('menu') &&
                !feature.toLowerCase().includes('cookie') &&
                !features.includes(feature) &&
                feature.match(/[a-zA-Z]/) &&
                (feature.toLowerCase().includes('kitchen') ||
                 feature.toLowerCase().includes('bathroom') ||
                 feature.toLowerCase().includes('bedroom') ||
                 feature.toLowerCase().includes('flooring') ||
                 feature.toLowerCase().includes('cabinet') ||
                 feature.toLowerCase().includes('appliance') ||
                 feature.toLowerCase().includes('window') ||
                 feature.toLowerCase().includes('door') ||
                 feature.toLowerCase().includes('storage') ||
                 feature.toLowerCase().includes('closet') ||
                 feature.toLowerCase().includes('counter') ||
                 feature.toLowerCase().includes('ceiling') ||
                 feature.toLowerCase().includes('vinyl') ||
                 feature.toLowerCase().includes('wood') ||
                 feature.toLowerCase().includes('tile') ||
                 feature.toLowerCase().includes('carpet'))) {
              
              features.push(feature);
              console.log(`Found feature: ${feature}`);
            }
          }
        }

        if (features.length > 0) {
          homeData.features = features;
          console.log(`Found ${features.length} features total`);
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
