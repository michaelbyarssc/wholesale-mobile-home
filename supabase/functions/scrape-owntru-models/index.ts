
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
    console.log('Starting OwnTru models scraping with 9/minute rate limit...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !firecrawlApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit: 9 requests per minute = 1 request every 6.67 seconds
    // We'll use 8 seconds to be safe
    const DELAY_BETWEEN_REQUESTS = 8000;

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
        formats: ['markdown', 'html'],
        onlyMainContent: false,
        waitFor: 8000,
        timeout: 45000
      }),
    });

    if (!mainPageResponse.ok) {
      const errorText = await mainPageResponse.text();
      throw new Error(`Main page scrape failed (${mainPageResponse.status}): ${errorText}`);
    }

    const mainPageData = await mainPageResponse.json();
    if (!mainPageData.success) {
      throw new Error(`Main page scrape error: ${JSON.stringify(mainPageData)}`);
    }

    // Extract model URLs from the main page
    const modelUrls = new Set<string>();
    const content = mainPageData.data?.markdown || '';
    const htmlContent = mainPageData.data?.html || '';
    const combinedContent = content + ' ' + htmlContent;
    
    console.log(`Main page content length: ${combinedContent.length} characters`);

    // Look for model links with more comprehensive patterns
    const patterns = [
      /href=["']([^"']*\/models\/[^"'/#?]+)["']/gi,
      /\[([^\]]+)\]\(([^)]*\/models\/[^)]+)\)/g,
      /owntru\.com\/models\/([a-z0-9\-]+)/gi,
      /\/models\/([a-z0-9\-]+)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(combinedContent)) !== null) {
        let url = match[1] || match[2] || match[0];
        
        // Clean and normalize URL
        if (!url.startsWith('http')) {
          if (url.startsWith('/')) {
            url = 'https://owntru.com' + url;
          } else if (url.includes('owntru.com')) {
            url = 'https://' + url.replace(/^https?:\/\//, '');
          } else {
            url = 'https://owntru.com/models/' + url.replace(/^\/models\//, '');
          }
        }
        
        // Filter valid model URLs
        if (url.includes('/models/') && 
            !url.endsWith('/models') && 
            !url.endsWith('/models/') &&
            !url.includes('#') &&
            !url.includes('?') &&
            url.match(/\/models\/[a-z0-9\-]+$/)) {
          modelUrls.add(url);
        }
      }
    }

    // Also try to find direct model names and construct URLs
    const modelNamePatterns = [
      /models?\/([a-z0-9\-]{3,})/gi,
      /\/([a-z0-9\-]{5,})\/?$/gm
    ];

    for (const pattern of modelNamePatterns) {
      let match;
      while ((match = pattern.exec(combinedContent)) !== null) {
        const modelName = match[1];
        if (modelName && 
            !modelName.includes('owntru') && 
            !modelName.includes('models') &&
            modelName.length >= 3) {
          modelUrls.add(`https://owntru.com/models/${modelName}`);
        }
      }
    }

    const uniqueUrls = Array.from(modelUrls).slice(0, 8); // Limit to 8 models to respect rate limits
    console.log(`Found ${uniqueUrls.length} model URLs to scrape:`, uniqueUrls);

    if (uniqueUrls.length === 0) {
      // If no URLs found, try some common model names
      const commonModels = [
        'the-ashland', 'the-bristol', 'the-charleston', 'the-denver',
        'the-everett', 'the-fairfield', 'the-georgetown', 'the-hartford'
      ];
      
      for (const model of commonModels.slice(0, 8)) {
        uniqueUrls.push(`https://owntru.com/models/${model}`);
      }
      
      console.log('No URLs found in content, using common model names:', uniqueUrls);
    }

    const mobileHomes: MobileHomeData[] = [];
    
    // Process each model URL with proper rate limiting
    for (let i = 0; i < uniqueUrls.length; i++) {
      const modelUrl = uniqueUrls[i];
      
      try {
        console.log(`[${i + 1}/${uniqueUrls.length}] Processing: ${modelUrl}`);
        
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
            onlyMainContent: false,
            waitFor: 10000,
            timeout: 60000,
            includeTags: ['div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'li', 'ul', 'table', 'td', 'tr'],
            excludeTags: ['script', 'style', 'nav', 'header', 'footer']
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

        const markdown = modelData.data?.markdown || '';
        const html = modelData.data?.html || '';
        const combinedContent = markdown + '\n\n' + html;
        
        console.log(`Content for ${modelUrl}: ${combinedContent.length} chars`);
        
        if (combinedContent.length < 200) {
          console.log(`Insufficient content for ${modelUrl}, skipping`);
          continue;
        }

        // Extract model name from URL
        const urlParts = modelUrl.split('/');
        const urlSlug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        let modelName = urlSlug.replace(/-/g, ' ').replace(/\bthe\b/gi, '').trim().toUpperCase();

        const homeData: MobileHomeData = {
          series: 'OwnTru',
          model: modelName.replace(/\s+/g, ''),
          display_name: modelName,
        };

        // Extract title/display name with more aggressive patterns
        const titlePatterns = [
          /<h1[^>]*>([^<]{3,50})<\/h1>/gi,
          /<title[^>]*>([^<|]+?)(?:\s*\|\s*OwnTru)?<\/title>/gi,
          /^#\s+([^\n\r]{3,50})/gm,
          /<h2[^>]*>([^<]{3,50})<\/h2>/gi,
          /\*\*\s*([A-Z][A-Z\s]{3,40})\s*\*\*/g,
          /class="[^"]*title[^"]*"[^>]*>([^<]{3,50})</gi,
          /class="[^"]*heading[^"]*"[^>]*>([^<]{3,50})</gi
        ];

        for (const pattern of titlePatterns) {
          const matches = [...combinedContent.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              const title = match[1].trim()
                .replace(/\s+/g, ' ')
                .replace(/owntru/gi, '')
                .replace(/mobile home/gi, '')
                .replace(/manufactured home/gi, '')
                .trim();
              
              if (title.length >= 3 && title.length <= 50 && 
                  !title.toLowerCase().includes('www') && 
                  !title.includes('http') &&
                  title.match(/[a-zA-Z]/)) {
                homeData.display_name = title;
                homeData.model = title.replace(/\s+/g, '');
                console.log(`Found title: ${title}`);
                break;
              }
            }
          }
          if (homeData.display_name !== modelName) break;
        }

        // Extract square footage with comprehensive patterns
        const sqftPatterns = [
          /(\d{3,4})\s*(?:sq\.?\s*ft\.?|square\s*feet?|sf\b)/gi,
          /square\s*footage[:\s]*(\d{3,4})/gi,
          /total\s*(?:area|size)[:\s]*(\d{3,4})/gi,
          /size[:\s]*(\d{3,4})\s*sq/gi,
          /(\d{3,4})\s*sq\b/gi,
          /area[:\s]*(\d{3,4})/gi,
          /living\s*space[:\s]*(\d{3,4})/gi
        ];

        for (const pattern of sqftPatterns) {
          const matches = [...combinedContent.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              const sqft = parseInt(match[1]);
              if (sqft >= 400 && sqft <= 3000) {
                homeData.square_footage = sqft;
                console.log(`Found square footage: ${sqft}`);
                break;
              }
            }
          }
          if (homeData.square_footage) break;
        }

        // Extract bedrooms with more patterns
        const bedroomPatterns = [
          /(\d+)\s*bed(?:room)?s?\b/gi,
          /bed(?:room)?s?[:\s]*(\d+)/gi,
          /(\d+)\s*br\b/gi,
          /(\d+)\/\d+.*bed/gi,
          /bedroom[s]?[:\s]*(\d+)/gi
        ];

        for (const pattern of bedroomPatterns) {
          const matches = [...combinedContent.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              const bedrooms = parseInt(match[1]);
              if (bedrooms >= 1 && bedrooms <= 6) {
                homeData.bedrooms = bedrooms;
                console.log(`Found bedrooms: ${bedrooms}`);
                break;
              }
            }
          }
          if (homeData.bedrooms) break;
        }

        // Extract bathrooms with more patterns
        const bathroomPatterns = [
          /(\d+(?:\.\d+)?)\s*bath(?:room)?s?\b/gi,
          /bath(?:room)?s?[:\s]*(\d+(?:\.\d+)?)/gi,
          /(\d+(?:\.\d+)?)\s*ba\b/gi,
          /\d+\/(\d+(?:\.\d+)?)\s*bath/gi,
          /bathroom[s]?[:\s]*(\d+(?:\.\d+)?)/gi
        ];

        for (const pattern of bathroomPatterns) {
          const matches = [...combinedContent.matchAll(pattern)];
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

        // Extract dimensions with comprehensive patterns
        const dimensionPatterns = [
          /(\d+)['"]?\s*[x×]\s*(\d+)['"]?/gi,
          /(\d+)\s*ft\s*[x×]\s*(\d+)\s*ft/gi,
          /length[:\s]*(\d+)[^0-9]*width[:\s]*(\d+)/gi,
          /width[:\s]*(\d+)[^0-9]*length[:\s]*(\d+)/gi,
          /(\d+)\s*by\s*(\d+)/gi,
          /dimensions[:\s]*(\d+)[^0-9]+(\d+)/gi,
          /size[:\s]*(\d+)[^0-9]+(\d+)/gi
        ];

        for (const pattern of dimensionPatterns) {
          const matches = [...combinedContent.matchAll(pattern)];
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

        // Extract description with improved patterns
        const descriptionPatterns = [
          /<p[^>]*>([^<]{150,1000})<\/p>/gi,
          /description[:\s]*([^.\n\r]{150,1000}\.)/gi,
          /about[:\s]*([^.\n\r]{150,1000}\.)/gi,
          /overview[:\s]*([^.\n\r]{150,1000}\.)/gi,
          /\n\n([A-Z][^.\n\r]{150,1000}\.)/g,
          /<div[^>]*>([^<]{150,1000})<\/div>/gi
        ];

        for (const pattern of descriptionPatterns) {
          const matches = [...combinedContent.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1]) {
              let desc = match[1].trim()
                .replace(/[*#\[\]<>]/g, '')
                .replace(/\s+/g, ' ')
                .replace(/owntru\.com[^\s]*/gi, '')
                .replace(/href=[^\s]*/gi, '')
                .replace(/class="[^"]*"/gi, '');
              
              if (desc.length >= 150 && desc.length <= 1000 && 
                  !desc.toLowerCase().includes('cookie') &&
                  !desc.includes('http') &&
                  desc.match(/[a-z]/i) &&
                  !desc.includes('javascript')) {
                homeData.description = desc;
                console.log(`Found description: ${desc.substring(0, 100)}...`);
                break;
              }
            }
          }
          if (homeData.description) break;
        }

        // Extract features with comprehensive patterns
        const features: string[] = [];
        const featurePatterns = [
          /<li[^>]*>([^<]{15,200})<\/li>/gi,
          /•\s*([^.\n\r]{15,200})/g,
          /-\s*([^.\n\r]{15,200})/g,
          /\*\s*([^.\n\r]{15,200})/g,
          /feature[s]?[:\s]*([^.\n\r]{15,200})/gi,
          /include[s]?[:\s]*([^.\n\r]{15,200})/gi,
          /amenities[:\s]*([^.\n\r]{15,200})/gi,
          /specification[s]?[:\s]*([^.\n\r]{15,200})/gi
        ];

        for (const pattern of featurePatterns) {
          const matches = [...combinedContent.matchAll(pattern)];
          for (const match of matches) {
            if (match && match[1] && features.length < 15) {
              let feature = match[1].trim()
                .replace(/[*#<>]/g, '')
                .replace(/\s+/g, ' ')
                .replace(/owntru\.com[^\s]*/gi, '')
                .replace(/href=[^\s]*/gi, '')
                .replace(/class="[^"]*"/gi, '');
              
              if (feature.length >= 15 && feature.length <= 200 && 
                  !features.includes(feature) &&
                  !feature.toLowerCase().includes('cookie') &&
                  !feature.includes('http') &&
                  feature.match(/[a-z]/i) &&
                  !feature.includes('javascript')) {
                features.push(feature);
              }
            }
          }
        }

        if (features.length > 0) {
          homeData.features = features;
          console.log(`Found ${features.length} features`);
        }

        mobileHomes.push(homeData);
        console.log(`Successfully processed: ${homeData.display_name}`);
        console.log('Final extracted data:', {
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
