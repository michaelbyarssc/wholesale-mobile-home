
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
        onlyMainContent: false, // Get all content to find links
        waitFor: 3000
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
    const mainHtml = mainPageData.data?.html || '';
    console.log('Main content lengths - Markdown:', mainMarkdown.length, 'HTML:', mainHtml.length);

    // Extract individual model URLs - try multiple approaches
    const modelUrls = new Set<string>();
    const combinedContent = mainMarkdown + ' ' + mainHtml;
    
    console.log('Extracting model URLs from main page...');
    console.log('Sample content:', combinedContent.substring(0, 1000));
    
    // Look for all possible URL patterns
    const urlPatterns = [
      /owntru\.com\/models\/([a-z0-9\-]+)/gi,
      /href=["']([^"']*\/models\/[a-z0-9\-]+[^"']*)/gi,
      /\[([^\]]+)\]\(([^)]*\/models\/[a-z0-9\-]+[^)]*)\)/gi,
      /\/models\/([a-z0-9\-]+)/gi
    ];

    for (const pattern of urlPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(combinedContent)) !== null) {
        let url = match[0];
        
        // Extract the actual URL from different formats
        if (url.includes('href=')) {
          const hrefMatch = url.match(/href=["']([^"']+)/);
          if (hrefMatch) url = hrefMatch[1];
        } else if (url.includes('](')) {
          const linkMatch = url.match(/\]\(([^)]+)\)/);
          if (linkMatch) url = linkMatch[1];
        }
        
        // Normalize URL
        if (!url.startsWith('http')) {
          if (url.startsWith('/')) {
            url = 'https://owntru.com' + url;
          } else if (url.includes('owntru.com')) {
            url = 'https://' + url;
          } else {
            url = 'https://owntru.com/models/' + url.replace(/^\/models\//, '');
          }
        }
        
        // Clean up URL
        url = url.replace(/\/$/, '').split('#')[0].split('?')[0];
        
        // Validate and add URL
        if (url.includes('/models/') && !url.endsWith('/models')) {
          const modelSlug = url.split('/models/')[1];
          if (modelSlug && modelSlug.length > 2 && /^[a-z0-9\-]+$/.test(modelSlug)) {
            modelUrls.add(url);
            console.log('Found model URL:', url);
          }
        }
      }
    }

    const uniqueUrls = Array.from(modelUrls);
    console.log(`Found ${uniqueUrls.length} unique model URLs`);

    if (uniqueUrls.length === 0) {
      // If no URLs found, try to find any links in the content
      console.log('No model URLs found, searching for any links...');
      const linkPattern = /href=["']([^"']+)["']/gi;
      let match;
      const allLinks = [];
      while ((match = linkPattern.exec(mainHtml)) !== null) {
        allLinks.push(match[1]);
      }
      console.log('All links found:', allLinks.slice(0, 20));
      
      return new Response(JSON.stringify({
        success: false,
        message: 'No model URLs found on the main page. The website structure may have changed.',
        debug: {
          contentLength: combinedContent.length,
          sampleContent: combinedContent.substring(0, 1000),
          allLinksFound: allLinks.slice(0, 10)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each model URL to get detailed information
    const mobileHomes: MobileHomeData[] = [];
    const maxModels = Math.min(uniqueUrls.length, 20); // Process up to 20 models

    console.log(`Processing ${maxModels} models...`);

    for (let i = 0; i < maxModels; i++) {
      const modelUrl = uniqueUrls[i];
      
      try {
        console.log(`[${i + 1}/${maxModels}] Processing: ${modelUrl}`);
        
        // Scrape the individual model page
        const modelPageResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: modelUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: false,
            waitFor: 4000
          })
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

        const modelMarkdown = modelPageData.data?.markdown || '';
        const modelHtml = modelPageData.data?.html || '';
        console.log(`Content for ${modelUrl} - Markdown: ${modelMarkdown.length}, HTML: ${modelHtml.length}`);
        
        if (modelMarkdown.length < 50 && modelHtml.length < 200) {
          console.log(`Skipping ${modelUrl} - insufficient content`);
          continue;
        }

        // Extract model name from URL
        const urlParts = modelUrl.split('/');
        const urlModelName = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        let modelName = urlModelName.replace(/-/g, ' ').toUpperCase();

        const modelData: MobileHomeData = {
          series: 'OwnTru',
          model: modelName.replace(/\s+/g, ''),
          display_name: modelName,
        };

        const combinedModelContent = modelMarkdown + ' ' + modelHtml;
        console.log(`Sample content for ${modelName}:`, combinedModelContent.substring(0, 500));

        // Try to extract title/model name from content
        const titlePatterns = [
          /<h1[^>]*>([^<]+)<\/h1>/i,
          /<title[^>]*>([^<]+)<\/title>/i,
          /^#\s+(.+)$/m,
          /\*\*([A-Z\s]+)\*\*/
        ];

        for (const pattern of titlePatterns) {
          const titleMatch = combinedModelContent.match(pattern);
          if (titleMatch && titleMatch[1]) {
            const foundTitle = titleMatch[1].trim().replace(/\s+/g, ' ');
            if (foundTitle.length >= 3 && foundTitle.length <= 30 && 
                !foundTitle.toLowerCase().includes('owntru') && 
                !foundTitle.includes('www')) {
              modelData.display_name = foundTitle;
              modelData.model = foundTitle.replace(/\s+/g, '');
              console.log(`Found title: ${foundTitle}`);
              break;
            }
          }
        }

        // Extract square footage - be more aggressive
        const sqftPatterns = [
          /(\d{3,4})\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet)/gi,
          /(\d{3,4})\s*sq/gi,
          /square\s*footage[:\s]*(\d{3,4})/gi,
          /size[:\s]*(\d{3,4})/gi,
          />(\d{3,4})[^0-9]*sq/gi,
          /(\d{3,4})[^0-9]*square/gi
        ];

        for (const pattern of sqftPatterns) {
          pattern.lastIndex = 0;
          const sqftMatch = pattern.exec(combinedModelContent);
          if (sqftMatch) {
            const sqft = parseInt(sqftMatch[1]);
            if (sqft >= 300 && sqft <= 3000) {
              modelData.square_footage = sqft;
              console.log(`Found square footage: ${sqft}`);
              break;
            }
          }
        }

        // Extract bedrooms - be more aggressive
        const bedroomPatterns = [
          /(\d+)\s*(?:bed|bedroom|br)\b/gi,
          /bed[room]*[:\s]*(\d+)/gi,
          />(\d+)[^0-9]*bed/gi,
          /(\d+)[^0-9]*bedroom/gi
        ];

        for (const pattern of bedroomPatterns) {
          pattern.lastIndex = 0;
          const bedroomMatch = pattern.exec(combinedModelContent);
          if (bedroomMatch) {
            const bedrooms = parseInt(bedroomMatch[1]);
            if (bedrooms >= 1 && bedrooms <= 6) {
              modelData.bedrooms = bedrooms;
              console.log(`Found bedrooms: ${bedrooms}`);
              break;
            }
          }
        }

        // Extract bathrooms - be more aggressive
        const bathroomPatterns = [
          /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)\b/gi,
          /bath[room]*[:\s]*(\d+(?:\.\d+)?)/gi,
          />(\d+(?:\.\d+)?)[^0-9]*bath/gi,
          /(\d+(?:\.\d+)?)[^0-9]*bathroom/gi
        ];

        for (const pattern of bathroomPatterns) {
          pattern.lastIndex = 0;
          const bathroomMatch = pattern.exec(combinedModelContent);
          if (bathroomMatch) {
            const bathrooms = parseFloat(bathroomMatch[1]);
            if (bathrooms >= 1 && bathrooms <= 4) {
              modelData.bathrooms = bathrooms;
              console.log(`Found bathrooms: ${bathrooms}`);
              break;
            }
          }
        }

        // Extract dimensions - be more aggressive
        const dimensionPatterns = [
          /(\d+)['"]?\s*[x×]\s*(\d+)['"]?/gi,
          /(\d+)\s*ft\s*[x×]\s*(\d+)\s*ft/gi,
          /length[:\s]*(\d+)[^0-9]*width[:\s]*(\d+)/gi,
          /width[:\s]*(\d+)[^0-9]*length[:\s]*(\d+)/gi,
          /(\d+)\s*by\s*(\d+)/gi,
          />(\d+)[^0-9]*x[^0-9]*(\d+)/gi
        ];

        for (const pattern of dimensionPatterns) {
          pattern.lastIndex = 0;
          const dimensionMatch = pattern.exec(combinedModelContent);
          if (dimensionMatch) {
            const dim1 = parseInt(dimensionMatch[1]);
            const dim2 = parseInt(dimensionMatch[2]);
            if (dim1 >= 10 && dim1 <= 40 && dim2 >= 30 && dim2 <= 100) {
              modelData.width_feet = Math.min(dim1, dim2);
              modelData.length_feet = Math.max(dim1, dim2);
              console.log(`Found dimensions: ${modelData.width_feet}x${modelData.length_feet}`);
              break;
            }
          }
        }

        // Extract description - look for paragraphs of text
        const descriptionPatterns = [
          /<p[^>]*>([^<]{50,500})<\/p>/gi,
          /^([A-Z][^.\n\r]{50,400}\.)/m,
          /description[:\s]*([^.\n\r]{50,400}\.)/gi,
          /\n([A-Z][^.\n\r]{50,400}\.)/g
        ];

        for (const pattern of descriptionPatterns) {
          pattern.lastIndex = 0;
          const descMatch = pattern.exec(combinedModelContent);
          if (descMatch && descMatch[1]) {
            let desc = descMatch[1].trim().replace(/[*#\[\]]/g, '').replace(/\s+/g, ' ');
            if (desc.length > 50 && desc.length < 500 && 
                !desc.includes('owntru.com') && 
                !desc.includes('href=') && 
                !desc.toLowerCase().includes('cookie')) {
              modelData.description = desc;
              console.log(`Found description: ${desc.substring(0, 80)}...`);
              break;
            }
          }
        }

        // Extract features - look for lists
        const features: string[] = [];
        const featurePatterns = [
          /<li[^>]*>([^<]{10,100})<\/li>/gi,
          /•\s*([^.\n\r]{10,100})/g,
          /-\s*([^.\n\r]{10,100})/g,
          /\*\s*([^.\n\r]{10,100})/g
        ];

        for (const pattern of featurePatterns) {
          let match;
          pattern.lastIndex = 0;
          while ((match = pattern.exec(combinedModelContent)) !== null && features.length < 8) {
            const feature = match[1].trim().replace(/[*#<>]/g, '').replace(/\s+/g, ' ');
            if (feature.length > 10 && feature.length < 100 && 
                !features.includes(feature) && 
                !feature.includes('owntru.com') && 
                !feature.includes('href=')) {
              features.push(feature);
            }
          }
          if (features.length > 0) break;
        }

        if (features.length > 0) {
          modelData.features = features;
          console.log(`Found ${features.length} features:`, features.slice(0, 2));
        }

        mobileHomes.push(modelData);
        console.log(`Successfully processed model: ${modelData.display_name}`);
        console.log('Data extracted:', {
          sqft: modelData.square_footage,
          bed: modelData.bedrooms,
          bath: modelData.bathrooms,
          dimensions: modelData.length_feet && modelData.width_feet ? `${modelData.width_feet}x${modelData.length_feet}` : null,
          features: modelData.features?.length || 0,
          hasDescription: !!modelData.description
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));

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
