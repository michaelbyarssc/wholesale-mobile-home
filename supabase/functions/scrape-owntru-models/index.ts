
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
    console.log('Starting OwnTru models scraping...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !firecrawlApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First scrape the main models page
    console.log('Scraping main models page...');
    const mainPageResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://owntru.com/models/',
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 5000
      }),
    });

    if (!mainPageResponse.ok) {
      throw new Error(`Main page scrape failed: ${mainPageResponse.status}`);
    }

    const mainPageData = await mainPageResponse.json();
    if (!mainPageData.success) {
      throw new Error(`Main page scrape error: ${mainPageData.error}`);
    }

    // Extract model URLs from the main page
    const modelUrls = new Set<string>();
    const content = mainPageData.data?.markdown || '';
    
    // Look for model links in various formats
    const patterns = [
      /\[([^\]]+)\]\(([^)]*\/models\/[^)]+)\)/g,
      /href=["']([^"']*\/models\/[^"']+)["']/g,
      /owntru\.com\/models\/([a-z0-9\-]+)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let url = match[2] || match[1] || match[0];
        
        if (!url.startsWith('http')) {
          if (url.startsWith('/')) {
            url = 'https://owntru.com' + url;
          } else if (url.includes('owntru.com')) {
            url = 'https://' + url;
          } else {
            url = 'https://owntru.com/models/' + url.replace(/^\/models\//, '');
          }
        }
        
        if (url.includes('/models/') && !url.endsWith('/models')) {
          modelUrls.add(url.split('#')[0].split('?')[0]);
        }
      }
    }

    const uniqueUrls = Array.from(modelUrls);
    console.log(`Found ${uniqueUrls.length} model URLs:`, uniqueUrls);

    if (uniqueUrls.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No model URLs found',
        debug: { contentSample: content.substring(0, 1000) }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mobileHomes: MobileHomeData[] = [];
    
    // Process each model URL with longer delays to avoid rate limits
    for (let i = 0; i < Math.min(uniqueUrls.length, 15); i++) {
      const modelUrl = uniqueUrls[i];
      
      try {
        console.log(`[${i + 1}/${uniqueUrls.length}] Processing: ${modelUrl}`);
        
        // Add delay to avoid rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 8000));
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
            onlyMainContent: false,
            waitFor: 6000,
            timeout: 30000
          })
        });

        if (!modelResponse.ok) {
          console.error(`Failed to scrape ${modelUrl}: ${modelResponse.status}`);
          continue;
        }

        const modelData = await modelResponse.json();
        if (!modelData.success) {
          console.error(`Model scrape error for ${modelUrl}:`, modelData.error);
          continue;
        }

        const markdown = modelData.data?.markdown || '';
        const html = modelData.data?.html || '';
        const combinedContent = markdown + ' ' + html;
        
        console.log(`Content received for ${modelUrl}: ${combinedContent.length} chars`);
        
        if (combinedContent.length < 100) {
          console.log(`Insufficient content for ${modelUrl}, skipping`);
          continue;
        }

        // Extract model name from URL
        const urlParts = modelUrl.split('/');
        const urlSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        let modelName = urlSlug.replace(/-/g, ' ').toUpperCase();

        const homeData: MobileHomeData = {
          series: 'OwnTru',
          model: modelName.replace(/\s+/g, ''),
          display_name: modelName,
        };

        // Extract title/display name from content
        const titlePatterns = [
          /<h1[^>]*>([^<]+)<\/h1>/i,
          /^#\s+([^\n\r]+)/m,
          /<title[^>]*>([^<]+?)\s*\|\s*OwnTru/i,
          /\*\*\s*([A-Z][A-Z\s]{2,30})\s*\*\*/,
          /^([A-Z][A-Z\s]{2,30})$/m
        ];

        for (const pattern of titlePatterns) {
          const match = combinedContent.match(pattern);
          if (match && match[1]) {
            const title = match[1].trim().replace(/\s+/g, ' ');
            if (title.length >= 3 && title.length <= 50 && 
                !title.toLowerCase().includes('owntru') &&
                !title.includes('www') && !title.includes('http')) {
              homeData.display_name = title;
              homeData.model = title.replace(/\s+/g, '');
              console.log(`Found title: ${title}`);
              break;
            }
          }
        }

        // Extract square footage with more patterns
        const sqftPatterns = [
          /(\d{3,4})\s*sq\.?\s*ft\.?/gi,
          /(\d{3,4})\s*square\s*feet/gi,
          /square\s*footage[:\s]*(\d{3,4})/gi,
          /total\s*area[:\s]*(\d{3,4})/gi,
          /(\d{3,4})\s*sf\b/gi,
          /size[:\s]*(\d{3,4})\s*sq/gi
        ];

        for (const pattern of sqftPatterns) {
          const match = combinedContent.match(pattern);
          if (match) {
            const sqft = parseInt(match[1]);
            if (sqft >= 200 && sqft <= 4000) {
              homeData.square_footage = sqft;
              console.log(`Found square footage: ${sqft}`);
              break;
            }
          }
        }

        // Extract bedrooms
        const bedroomPatterns = [
          /(\d+)\s*bed(?:room)?s?\b/gi,
          /bed(?:room)?s?[:\s]*(\d+)/gi,
          /(\d+)\s*br\b/gi,
          /(\d+)\/\d+\s*bed/gi
        ];

        for (const pattern of bedroomPatterns) {
          const match = combinedContent.match(pattern);
          if (match) {
            const bedrooms = parseInt(match[1]);
            if (bedrooms >= 1 && bedrooms <= 8) {
              homeData.bedrooms = bedrooms;
              console.log(`Found bedrooms: ${bedrooms}`);
              break;
            }
          }
        }

        // Extract bathrooms
        const bathroomPatterns = [
          /(\d+(?:\.\d+)?)\s*bath(?:room)?s?\b/gi,
          /bath(?:room)?s?[:\s]*(\d+(?:\.\d+)?)/gi,
          /(\d+(?:\.\d+)?)\s*ba\b/gi,
          /\d+\/(\d+(?:\.\d+)?)\s*bath/gi
        ];

        for (const pattern of bathroomPatterns) {
          const match = combinedContent.match(pattern);
          if (match) {
            const bathrooms = parseFloat(match[1]);
            if (bathrooms >= 0.5 && bathrooms <= 5) {
              homeData.bathrooms = bathrooms;
              console.log(`Found bathrooms: ${bathrooms}`);
              break;
            }
          }
        }

        // Extract dimensions
        const dimensionPatterns = [
          /(\d+)['"]?\s*[x×]\s*(\d+)['"]?/gi,
          /(\d+)\s*ft\s*[x×]\s*(\d+)\s*ft/gi,
          /length[:\s]*(\d+)[^0-9]*width[:\s]*(\d+)/gi,
          /width[:\s]*(\d+)[^0-9]*length[:\s]*(\d+)/gi,
          /(\d+)\s*by\s*(\d+)/gi,
          /dimensions[:\s]*(\d+)[^0-9]+(\d+)/gi
        ];

        for (const pattern of dimensionPatterns) {
          const match = combinedContent.match(pattern);
          if (match) {
            const dim1 = parseInt(match[1]);
            const dim2 = parseInt(match[2]);
            if (dim1 >= 8 && dim1 <= 50 && dim2 >= 20 && dim2 <= 120) {
              homeData.width_feet = Math.min(dim1, dim2);
              homeData.length_feet = Math.max(dim1, dim2);
              console.log(`Found dimensions: ${homeData.width_feet}x${homeData.length_feet}`);
              break;
            }
          }
        }

        // Extract description
        const descriptionPatterns = [
          /<p[^>]*>([^<]{100,800})<\/p>/gi,
          /description[:\s]*([^.\n\r]{100,800}\.)/gi,
          /about[:\s]*([^.\n\r]{100,800}\.)/gi,
          /overview[:\s]*([^.\n\r]{100,800}\.)/gi,
          /\n([A-Z][^.\n\r]{100,800}\.)/g
        ];

        for (const pattern of descriptionPatterns) {
          const match = combinedContent.match(pattern);
          if (match && match[1]) {
            let desc = match[1].trim()
              .replace(/[*#\[\]]/g, '')
              .replace(/\s+/g, ' ')
              .replace(/owntru\.com[^\s]*/gi, '')
              .replace(/href=[^\s]*/gi, '');
            
            if (desc.length >= 100 && desc.length <= 800 && 
                !desc.toLowerCase().includes('cookie') &&
                !desc.includes('http') &&
                desc.match(/[a-z]/i)) {
              homeData.description = desc;
              console.log(`Found description: ${desc.substring(0, 100)}...`);
              break;
            }
          }
        }

        // Extract features
        const features: string[] = [];
        const featurePatterns = [
          /<li[^>]*>([^<]{10,150})<\/li>/gi,
          /•\s*([^.\n\r]{10,150})/g,
          /-\s*([^.\n\r]{10,150})/g,
          /\*\s*([^.\n\r]{10,150})/g,
          /feature[s]?[:\s]*([^.\n\r]{10,150})/gi,
          /include[s]?[:\s]*([^.\n\r]{10,150})/gi
        ];

        for (const pattern of featurePatterns) {
          let match;
          while ((match = pattern.exec(combinedContent)) !== null && features.length < 12) {
            let feature = match[1].trim()
              .replace(/[*#<>]/g, '')
              .replace(/\s+/g, ' ')
              .replace(/owntru\.com[^\s]*/gi, '')
              .replace(/href=[^\s]*/gi, '');
            
            if (feature.length >= 10 && feature.length <= 150 && 
                !features.includes(feature) &&
                !feature.toLowerCase().includes('cookie') &&
                !feature.includes('http') &&
                feature.match(/[a-z]/i)) {
              features.push(feature);
            }
          }
          if (features.length >= 8) break;
        }

        if (features.length > 0) {
          homeData.features = features;
          console.log(`Found ${features.length} features`);
        }

        mobileHomes.push(homeData);
        console.log(`Successfully processed: ${homeData.display_name}`);
        console.log('Extracted data:', {
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
          .single();

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
