
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
        formats: ['markdown'],
        onlyMainContent: true,
        includeTags: ['h1', 'h2', 'h3', 'a', 'p'],
        excludeTags: ['nav', 'footer', 'header', 'script', 'style'],
        waitFor: 1000
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

    const mainMarkdown = mainPageData.data?.markdown || '';
    console.log('Main markdown length:', mainMarkdown.length);

    // Extract individual model URLs from the main page
    const modelUrls = new Set<string>();
    
    console.log('Extracting model URLs from main page...');
    
    // Look for model-specific URLs in the markdown
    const urlPatterns = [
      /https:\/\/owntru\.com\/models\/[a-z0-9]+[a-z0-9\/]*/gi,
      /owntru\.com\/models\/[a-z0-9]+[a-z0-9\/]*/gi,
      /\/models\/[a-z0-9]+[a-z0-9\/]*/gi
    ];

    for (const pattern of urlPatterns) {
      let match;
      while ((match = pattern.exec(mainMarkdown)) !== null) {
        let url = match[0];
        
        // Clean up and normalize URL
        if (!url.startsWith('http')) {
          url = 'https://owntru.com' + (url.startsWith('/') ? '' : '/') + url;
        }
        
        // Filter out non-specific URLs
        if (url.includes('/models/') && !url.endsWith('/models/') && !url.includes('#')) {
          // Remove trailing slashes and fragments
          url = url.replace(/\/$/, '').split('#')[0];
          modelUrls.add(url);
          console.log('Found model URL:', url);
        }
      }
    }

    // Remove duplicates and invalid URLs
    const cleanUrls = Array.from(modelUrls).filter(url => {
      const pathParts = url.split('/');
      const modelPart = pathParts[pathParts.length - 1];
      return modelPart && modelPart.length > 3 && /^[a-z0-9]+$/.test(modelPart);
    });

    console.log(`Found ${cleanUrls.length} clean model URLs`);

    if (cleanUrls.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No model URLs found on the main page. The website structure may have changed.',
        data: {
          totalProcessed: 0,
          created: 0,
          updated: 0,
          homes: [],
          debugInfo: {
            mainMarkdownLength: mainMarkdown.length,
            sampleContent: mainMarkdown.substring(0, 500)
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process models in smaller batches to avoid timeout
    const mobileHomes: MobileHomeData[] = [];
    const maxModels = Math.min(6, cleanUrls.length); // Reduced to 6 for more processing time per model
    let processedCount = 0;

    console.log(`Processing ${maxModels} models to avoid timeout...`);

    for (let i = 0; i < maxModels; i++) {
      const modelUrl = cleanUrls[i];
      
      try {
        console.log(`[${i + 1}/${maxModels}] Scraping: ${modelUrl}`);
        
        // Add timeout to individual requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased timeout

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
            includeTags: ['h1', 'h2', 'h3', 'p', 'div', 'ul', 'li', 'span', 'td', 'th'],
            excludeTags: ['nav', 'footer', 'header', 'script', 'style'],
            waitFor: 3000
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!modelPageResponse.ok) {
          console.error(`Failed to scrape ${modelUrl}:`, modelPageResponse.status);
          continue;
        }

        const modelPageData = await modelPageResponse.json();
        
        if (!modelPageData.success) {
          console.error(`Firecrawl failed for ${modelUrl}:`, modelPageData.error);
          continue;
        }

        const modelMarkdown = modelPageData.data?.markdown || '';
        const modelHtml = modelPageData.data?.html || '';
        console.log(`Content length for ${modelUrl}:`, modelMarkdown.length);
        
        // Log a sample of the content for debugging
        console.log(`Sample content from ${modelUrl}:`, modelMarkdown.substring(0, 300));

        if (modelMarkdown.length < 100) {
          console.log(`Skipping ${modelUrl} - insufficient content`);
          continue;
        }

        // Extract model name from URL
        const urlParts = modelUrl.split('/');
        const urlModelName = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        let modelName = urlModelName.replace(/-/g, ' ').toUpperCase();

        // Try to find a better model name in the content with more specific patterns
        const titlePatterns = [
          /^#\s+([A-Z][A-Z\s0-9]+)$/m,
          /^##\s+([A-Z][A-Z\s0-9]+)$/m,
          /^###\s+([A-Z][A-Z\s0-9]+)$/m,
          /\*\*([A-Z][A-Z\s0-9]{2,15})\*\*/,
          /^([A-Z][A-Z\s0-9]{2,15})(?:\s*\n|\s*$)/m,
          /<h[1-3][^>]*>([A-Z][A-Z\s0-9]{2,15})<\/h[1-3]>/i
        ];

        for (const pattern of titlePatterns) {
          const titleMatch = modelMarkdown.match(pattern) || modelHtml.match(pattern);
          if (titleMatch && titleMatch[1] && titleMatch[1].length >= 3 && titleMatch[1].length <= 20) {
            modelName = titleMatch[1].trim();
            console.log(`Found title: ${modelName}`);
            break;
          }
        }

        const modelData: MobileHomeData = {
          series: 'OwnTru',
          model: modelName.replace(/\s+/g, ''),
          display_name: modelName,
        };

        // Extract description with better patterns
        const descriptionPatterns = [
          /(?:description|about|overview)[:\s]*([^.\n]{30,300}\.?)/i,
          /^([A-Z][^.\n]{30,300}\.)/m,
          /\*\*[^*]+\*\*\s*([^.\n]{30,300}\.)/,
          /<p[^>]*>([^<]{30,300}\.?)<\/p>/i,
          /^[^#\*\[\n]+([^.\n]{30,300}\.)/m
        ];

        for (const pattern of descriptionPatterns) {
          const descMatch = (modelMarkdown + ' ' + modelHtml).match(pattern);
          if (descMatch && descMatch[1] && descMatch[1].length > 30 && descMatch[1].length < 400) {
            const desc = descMatch[1].trim().replace(/[*#\[\]]/g, '').replace(/\s+/g, ' ');
            if (!desc.includes('owntru.com') && !desc.includes('href=') && !desc.includes('](')) {
              modelData.description = desc;
              console.log(`Found description: ${modelData.description.substring(0, 50)}...`);
              break;
            }
          }
        }

        // Extract square footage with more comprehensive patterns
        const sqftPatterns = [
          /(\d{3,4})\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet)/i,
          /(?:size|area|footage)[:\s]*(\d{3,4})/i,
          /(\d{3,4})\s*sf\b/i,
          /(\d{3,4})\s*sq/i,
          /<td[^>]*>(\d{3,4})[^<]*(?:sq|ft)/i,
          /square\s*footage[:\s]*(\d{3,4})/i
        ];

        for (const pattern of sqftPatterns) {
          const sqftMatch = (modelMarkdown + ' ' + modelHtml).match(pattern);
          if (sqftMatch) {
            const sqft = parseInt(sqftMatch[1]);
            if (sqft >= 400 && sqft <= 3000) {
              modelData.square_footage = sqft;
              console.log(`Found square footage: ${modelData.square_footage}`);
              break;
            }
          }
        }

        // Extract bedrooms with improved patterns
        const bedroomPatterns = [
          /(\d+)\s*(?:bed|bedroom|br)\b/i,
          /(?:bed|bedroom|br)[:\s]*(\d+)/i,
          /<td[^>]*>(\d+)[^<]*bed/i,
          /bedrooms?[:\s]*(\d+)/i
        ];

        for (const pattern of bedroomPatterns) {
          const bedroomMatch = (modelMarkdown + ' ' + modelHtml).match(pattern);
          if (bedroomMatch) {
            const bedrooms = parseInt(bedroomMatch[1]);
            if (bedrooms >= 1 && bedrooms <= 6) {
              modelData.bedrooms = bedrooms;
              console.log(`Found bedrooms: ${modelData.bedrooms}`);
              break;
            }
          }
        }

        // Extract bathrooms with improved patterns
        const bathroomPatterns = [
          /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)\b/i,
          /(?:bath|bathroom|ba)[:\s]*(\d+(?:\.\d+)?)/i,
          /<td[^>]*>(\d+(?:\.\d+)?)[^<]*bath/i,
          /bathrooms?[:\s]*(\d+(?:\.\d+)?)/i
        ];

        for (const pattern of bathroomPatterns) {
          const bathroomMatch = (modelMarkdown + ' ' + modelHtml).match(pattern);
          if (bathroomMatch) {
            const bathrooms = parseFloat(bathroomMatch[1]);
            if (bathrooms >= 1 && bathrooms <= 4) {
              modelData.bathrooms = bathrooms;
              console.log(`Found bathrooms: ${modelData.bathrooms}`);
              break;
            }
          }
        }

        // Extract dimensions with comprehensive patterns
        const dimensionPatterns = [
          /(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)(?:\s*ft|\s*feet)?/i,
          /(?:dimensions|size)[:\s]*(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)/i,
          /(\d+)'?\s*x\s*(\d+)'/i,
          /<td[^>]*>(\d+)[^<]*x[^<]*(\d+)/i,
          /length[:\s]*(\d+)[^0-9]*width[:\s]*(\d+)/i,
          /width[:\s]*(\d+)[^0-9]*length[:\s]*(\d+)/i,
          /(\d+)\s*ft\s*x\s*(\d+)\s*ft/i
        ];

        for (const pattern of dimensionPatterns) {
          const dimensionMatch = (modelMarkdown + ' ' + modelHtml).match(pattern);
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

        // Extract features with improved patterns
        const featurePatterns = [
          /(?:features|includes|amenities)[:\s]*([^.\n]+(?:\.[^.\n]+)*)/i,
          /•\s*([^.\n]{5,80})/g,
          /-\s*([^.\n]{5,80})/g,
          /\*\s*([^.\n]{5,80})/g,
          /<li[^>]*>([^<]{5,80})<\/li>/gi,
          /^\s*-\s*([^.\n]{5,80})$/gm
        ];

        const features: string[] = [];
        const combinedContent = modelMarkdown + ' ' + modelHtml;
        
        for (const pattern of featurePatterns) {
          if (pattern.global) {
            let match;
            pattern.lastIndex = 0; // Reset regex state
            while ((match = pattern.exec(combinedContent)) !== null && features.length < 8) {
              const feature = match[1].trim().replace(/[*#<>]/g, '').replace(/\s+/g, ' ');
              if (feature.length > 5 && feature.length < 80 && 
                  !features.includes(feature) && 
                  !feature.includes('owntru.com') && 
                  !feature.includes('href=')) {
                features.push(feature);
              }
            }
          } else {
            const match = combinedContent.match(pattern);
            if (match && match[1]) {
              const featureText = match[1].trim();
              const splitFeatures = featureText.split(/[,;]/).map(f => f.trim().replace(/[*#<>]/g, '')).filter(f => f.length > 5);
              features.push(...splitFeatures.slice(0, 5));
              break;
            }
          }
        }

        if (features.length > 0) {
          modelData.features = [...new Set(features)].slice(0, 8); // Remove duplicates and limit
          console.log(`Found ${features.length} features:`, features.slice(0, 3));
        }

        mobileHomes.push(modelData);
        console.log(`Successfully processed model: ${modelName}`);
        processedCount++;

        // Delay between requests
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
          features_count: h.features?.length || 0,
          description: h.description ? h.description.substring(0, 50) + '...' : null
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
