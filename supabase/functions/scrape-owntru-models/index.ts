
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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not found in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Crawl the OwnTru models page
    console.log('Crawling OwnTru models page...');
    const crawlResponse = await fetch('https://api.firecrawl.dev/v0/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://owntru.com/models/',
        crawlerOptions: {
          includes: ['https://owntru.com/models/*'],
          limit: 50,
        },
        pageOptions: {
          onlyMainContent: true,
          includeHtml: false,
        }
      }),
    });

    if (!crawlResponse.ok) {
      throw new Error(`Firecrawl API error: ${crawlResponse.status} ${crawlResponse.statusText}`);
    }

    const crawlData = await crawlResponse.json();
    console.log('Crawl initiated, job ID:', crawlData.jobId);

    // Poll for crawl completion
    let crawlComplete = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    let crawlResult;

    while (!crawlComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`https://api.firecrawl.dev/v0/crawl/status/${crawlData.jobId}`, {
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Failed to check crawl status: ${statusResponse.status}`);
      }

      crawlResult = await statusResponse.json();
      console.log('Crawl status:', crawlResult.status);

      if (crawlResult.status === 'completed') {
        crawlComplete = true;
      } else if (crawlResult.status === 'failed') {
        throw new Error('Crawl failed');
      }
      
      attempts++;
    }

    if (!crawlComplete) {
      throw new Error('Crawl timed out');
    }

    console.log(`Successfully crawled ${crawlResult.data.length} pages`);

    // Parse the scraped data to extract mobile home information
    const mobileHomes: MobileHomeData[] = [];
    
    for (const page of crawlResult.data) {
      const content = page.content || '';
      const url = page.metadata?.sourceURL || '';
      
      // Skip the main models page, focus on individual model pages
      if (url === 'https://owntru.com/models/' || !url.includes('/models/')) {
        continue;
      }

      console.log('Processing page:', url);
      
      // Extract model information from the content
      const modelData: MobileHomeData = {
        series: 'OwnTru',
        model: '',
        display_name: '',
      };

      // Extract model name from URL or title
      const urlParts = url.split('/');
      const modelSlug = urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1];
      
      // Extract title/display name
      const titleMatch = content.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:Mobile Home|Model|Floor Plan)/i);
      if (titleMatch) {
        modelData.display_name = titleMatch[1].trim();
        modelData.model = titleMatch[1].trim().replace(/\s+/g, '');
      } else {
        // Fallback to URL slug
        modelData.display_name = modelSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        modelData.model = modelSlug.replace(/-/g, '');
      }

      // Extract square footage
      const sqftMatch = content.match(/(\d{1,4})\s*(?:sq\.?\s*ft\.?|square\s+feet)/i);
      if (sqftMatch) {
        modelData.square_footage = parseInt(sqftMatch[1]);
      }

      // Extract bedrooms
      const bedroomMatch = content.match(/(\d+)\s*(?:bed|bedroom)/i);
      if (bedroomMatch) {
        modelData.bedrooms = parseInt(bedroomMatch[1]);
      }

      // Extract bathrooms
      const bathroomMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom)/i);
      if (bathroomMatch) {
        modelData.bathrooms = parseFloat(bathroomMatch[1]);
      }

      // Extract dimensions
      const dimensionMatch = content.match(/(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)(?:\s*ft)?/i);
      if (dimensionMatch) {
        modelData.width_feet = parseInt(dimensionMatch[1]);
        modelData.length_feet = parseInt(dimensionMatch[2]);
      }

      // Extract description
      const descriptionMatch = content.match(/description[:\s]*([^.!?]{50,500}[.!?])/i);
      if (descriptionMatch) {
        modelData.description = descriptionMatch[1].trim();
      }

      // Extract features
      const featuresSection = content.match(/features?[:\s]*(.*?)(?:\n\n|\n[A-Z]|\n$)/is);
      if (featuresSection) {
        const featureText = featuresSection[1];
        const features = featureText
          .split(/[•\-\*\n]/)
          .map(f => f.trim())
          .filter(f => f.length > 3 && f.length < 100);
        
        if (features.length > 0) {
          modelData.features = features.slice(0, 10); // Limit to 10 features
        }
      }

      if (modelData.display_name) {
        mobileHomes.push(modelData);
        console.log('Extracted mobile home:', modelData.display_name);
      }
    }

    console.log(`Extracted ${mobileHomes.length} mobile homes`);

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
        homes: mobileHomes.map(h => ({ display_name: h.display_name, model: h.model })),
      }
    };

    console.log('Scraping completed:', result.message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-owntru-models function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Failed to scrape OwnTru models'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
