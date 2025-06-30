
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting OwnTru models scraping...');
    
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasFirecrawlKey: !!firecrawlApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not found in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, scrape the main models page to get all model links
    console.log('Scraping main models page for model links...');
    
    const mainPageResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://owntru.com/models/',
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        includeTags: ['h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'a'],
        excludeTags: ['nav', 'footer', 'header', 'script', 'style'],
        waitFor: 2000
      }),
    });

    if (!mainPageResponse.ok) {
      const errorText = await mainPageResponse.text();
      console.error('Firecrawl API error:', mainPageResponse.status, errorText);
      throw new Error(`Firecrawl API error: ${mainPageResponse.status} ${mainPageResponse.statusText}`);
    }

    const mainPageData = await mainPageResponse.json();
    console.log('Main page response received');
    
    if (!mainPageData.success) {
      throw new Error(`Firecrawl failed: ${mainPageData.error || 'Unknown error'}`);
    }

    const mainContent = mainPageData.data?.content || '';
    const mainMarkdown = mainPageData.data?.markdown || '';
    
    console.log('Main content length:', mainContent.length);
    console.log('Main markdown length:', mainMarkdown.length);

    // Extract individual model URLs from the main page
    const modelUrls = new Set<string>();
    const textToAnalyze = mainMarkdown.length > mainContent.length ? mainMarkdown : mainContent;
    
    console.log('Extracting model URLs from main page...');
    
    // Look for links that point to individual model pages
    const linkPatterns = [
      /https:\/\/owntru\.com\/models\/[^\/\s)]+/g,
      /owntru\.com\/models\/[^\/\s)]+/g,
      /\/models\/[^\/\s)]+/g
    ];

    for (const pattern of linkPatterns) {
      let match;
      while ((match = pattern.exec(textToAnalyze)) !== null) {
        let url = match[0];
        if (!url.startsWith('http')) {
          url = 'https://owntru.com' + (url.startsWith('/') ? '' : '/') + url;
        }
        if (!url.includes('owntru.com/models/')) {
          url = url.replace('owntru.com/', 'owntru.com/models/');
        }
        modelUrls.add(url);
        console.log('Found model URL:', url);
      }
    }

    // If no URLs found, try a different approach - look for model names and construct URLs
    if (modelUrls.size === 0) {
      console.log('No direct URLs found, trying to extract model names...');
      
      const modelNamePatterns = [
        /\*\*([A-Z][A-Z\s]+?)\*\*/g,
        /^#{1,4}\s+([A-Z][A-Z\s]+?)(?:\s*$|\s*\n)/gm,
        /([A-Z]{4,}(?:\s+[A-Z]{4,})*)/g
      ];

      const foundNames = new Set<string>();
      
      for (const pattern of modelNamePatterns) {
        let match;
        while ((match = pattern.exec(textToAnalyze)) !== null) {
          const name = match[1].trim();
          if (name.length >= 4 && name.length <= 20 && !name.includes('HTTP') && !name.includes('OWN')) {
            foundNames.add(name);
            const urlName = name.toLowerCase().replace(/\s+/g, '-');
            const constructedUrl = `https://owntru.com/models/${urlName}/`;
            modelUrls.add(constructedUrl);
            console.log('Constructed model URL from name:', constructedUrl, 'for model:', name);
          }
        }
      }
    }

    console.log(`Found ${modelUrls.size} potential model URLs`);

    if (modelUrls.size === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No model URLs found on the main page. The website structure may have changed.',
        data: {
          totalProcessed: 0,
          created: 0,
          updated: 0,
          homes: [],
          debugInfo: {
            mainContentLength: mainContent.length,
            mainMarkdownLength: mainMarkdown.length,
            firstLines: textToAnalyze.split('\n').slice(0, 20)
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Now scrape each individual model page
    const mobileHomes: MobileHomeData[] = [];
    let processedCount = 0;

    for (const modelUrl of Array.from(modelUrls).slice(0, 15)) { // Limit to 15 to avoid timeouts
      try {
        console.log(`Scraping individual model page: ${modelUrl}`);
        
        const modelPageResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: modelUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            includeTags: ['h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'ul', 'li'],
            excludeTags: ['nav', 'footer', 'header', 'script', 'style'],
            waitFor: 3000
          }),
        });

        if (!modelPageResponse.ok) {
          console.error(`Failed to scrape ${modelUrl}:`, modelPageResponse.status);
          continue;
        }

        const modelPageData = await modelPageResponse.json();
        
        if (!modelPageData.success) {
          console.error(`Firecrawl failed for ${modelUrl}:`, modelPageData.error);
          continue;
        }

        const modelContent = modelPageData.data?.content || '';
        const modelMarkdown = modelPageData.data?.markdown || '';
        const modelText = modelMarkdown.length > modelContent.length ? modelMarkdown : modelContent;
        
        console.log(`Model page content length for ${modelUrl}:`, modelText.length);

        if (modelText.length < 100) {
          console.log(`Skipping ${modelUrl} - insufficient content`);
          continue;
        }

        // Extract model name from URL or content
        const urlParts = modelUrl.split('/');
        const urlModelName = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
        let modelName = urlModelName.replace(/-/g, ' ').toUpperCase();

        // Try to find a better model name in the content
        const titleMatches = modelText.match(/^#{1,2}\s+([A-Z][A-Z\s]+?)(?:\s*$|\s*\n)/m) || 
                           modelText.match(/\*\*([A-Z][A-Z\s]+?)\*\*/);
        if (titleMatches) {
          modelName = titleMatches[1].trim();
        }

        console.log(`Processing model: ${modelName}`);

        const modelData: MobileHomeData = {
          series: 'OwnTru',
          model: modelName.replace(/\s+/g, ''),
          display_name: modelName,
        };

        // Extract description
        const descriptionPatterns = [
          /(?:description|about|overview)[\s:]*([^.\n]+(?:\.[^.\n]+)*)/i,
          /^([^.\n]+(?:\.[^.\n]+){0,2})/m
        ];

        for (const pattern of descriptionPatterns) {
          const descMatch = modelText.match(pattern);
          if (descMatch && descMatch[1] && descMatch[1].length > 20 && descMatch[1].length < 500) {
            modelData.description = descMatch[1].trim();
            console.log(`Found description: ${modelData.description.substring(0, 100)}...`);
            break;
          }
        }

        // Extract square footage
        const sqftPatterns = [
          /(\d{3,4})\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i,
          /(?:size|area)[\s:]*(\d{3,4})/i
        ];

        for (const pattern of sqftPatterns) {
          const sqftMatch = modelText.match(pattern);
          if (sqftMatch) {
            const sqft = parseInt(sqftMatch[1]);
            if (sqft >= 400 && sqft <= 3000) {
              modelData.square_footage = sqft;
              console.log(`Found square footage: ${modelData.square_footage}`);
              break;
            }
          }
        }

        // Extract bedrooms
        const bedroomPatterns = [
          /(\d+)\s*(?:bed|bedroom)/i,
          /(?:bed|bedroom)[\s:]*(\d+)/i
        ];

        for (const pattern of bedroomPatterns) {
          const bedroomMatch = modelText.match(pattern);
          if (bedroomMatch) {
            const bedrooms = parseInt(bedroomMatch[1]);
            if (bedrooms >= 1 && bedrooms <= 6) {
              modelData.bedrooms = bedrooms;
              console.log(`Found bedrooms: ${modelData.bedrooms}`);
              break;
            }
          }
        }

        // Extract bathrooms
        const bathroomPatterns = [
          /(\d+(?:\.\d+)?)\s*(?:bath|bathroom)/i,
          /(?:bath|bathroom)[\s:]*(\d+(?:\.\d+)?)/i
        ];

        for (const pattern of bathroomPatterns) {
          const bathroomMatch = modelText.match(pattern);
          if (bathroomMatch) {
            const bathrooms = parseFloat(bathroomMatch[1]);
            if (bathrooms >= 1 && bathrooms <= 4) {
              modelData.bathrooms = bathrooms;
              console.log(`Found bathrooms: ${modelData.bathrooms}`);
              break;
            }
          }
        }

        // Extract dimensions
        const dimensionPatterns = [
          /(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)(?:\s*ft)?/i,
          /(?:dimensions|size)[\s:]*(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)/i
        ];

        for (const pattern of dimensionPatterns) {
          const dimensionMatch = modelText.match(pattern);
          if (dimensionMatch) {
            const dim1 = parseInt(dimensionMatch[1]);
            const dim2 = parseInt(dimensionMatch[2]);
            if (dim1 >= 12 && dim1 <= 32 && dim2 >= 40 && dim2 <= 80) {
              modelData.width_feet = Math.min(dim1, dim2);
              modelData.length_feet = Math.max(dim1, dim2);
              console.log(`Found dimensions: ${modelData.width_feet}x${modelData.length_feet}`);
              break;
            }
          }
        }

        // Extract features
        const featurePatterns = [
          /(?:features|includes|amenities)[\s:]*([^.\n]+(?:\.[^.\n]+)*)/i,
          /•\s*([^.\n]+)/g,
          /-\s*([^.\n]+)/g
        ];

        const features: string[] = [];
        for (const pattern of featurePatterns) {
          let match;
          while ((match = pattern.exec(modelText)) !== null && features.length < 10) {
            const feature = match[1].trim();
            if (feature.length > 5 && feature.length < 100) {
              features.push(feature);
            }
          }
        }

        if (features.length > 0) {
          modelData.features = features;
          console.log(`Found ${features.length} features`);
        }

        mobileHomes.push(modelData);
        console.log(`Successfully processed model: ${modelName}`);
        processedCount++;

        // Small delay to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing model URL ${modelUrl}:`, error);
        continue;
      }
    }

    console.log(`Extracted ${mobileHomes.length} mobile homes with detailed data`);

    // Update or create mobile homes in database
    let updatedCount = 0;
    let createdCount = 0;

    for (const homeData of mobileHomes) {
      try {
        // Check if mobile home already exists
        const { data: existingHome } = await supabase
          .from('mobile_homes')
          .select('id, display_order')
          .or(`display_name.ilike.%${homeData.display_name}%,model.ilike.%${homeData.model}%`)
          .single();

        if (existingHome) {
          // Update existing home
          const { error: updateError } = await supabase
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

          if (updateError) {
            console.error('Error updating mobile home:', updateError);
          } else {
            updatedCount++;
            console.log('Updated mobile home:', homeData.display_name);
          }
        } else {
          // Create new home
          const { data: maxOrderData } = await supabase
            .from('mobile_homes')
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1);

          const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

          const { error: insertError } = await supabase
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
              price: 0, // Default price, will need to be updated manually
              minimum_profit: 0,
              display_order: nextOrder,
              active: true,
            });

          if (insertError) {
            console.error('Error creating mobile home:', insertError);
          } else {
            createdCount++;
            console.log('Created mobile home:', homeData.display_name);
          }
        }
      } catch (error) {
        console.error('Error processing mobile home:', homeData.display_name, error);
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
          features_count: h.features?.length || 0
        })),
      }
    };

    console.log('Scraping completed successfully:', result.message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-owntru-models function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        message: 'Failed to scrape OwnTru models'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
