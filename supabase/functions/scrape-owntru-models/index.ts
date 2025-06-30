
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

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasFirecrawlKey: !!firecrawlApiKey
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required Supabase environment variables');
    }

    if (!firecrawlApiKey) {
      throw new Error('Missing FIRECRAWL_API_KEY environment variable. Please configure it in Edge Function Secrets.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to scrape with Firecrawl
    let mobileHomes: MobileHomeData[] = [];
    let scrapingSuccessful = false;

    try {
      console.log('Attempting to scrape with Firecrawl...');
      
      const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://owntru.com/models/',
          formats: ['markdown'],
          onlyMainContent: true,
          timeout: 30000
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.markdown) {
          console.log('Successfully scraped OwnTru models page');
          
          // Parse the scraped markdown content to extract model information
          const markdown = data.data.markdown;
          console.log('Scraped content length:', markdown.length);
          
          // For now, we'll need to implement proper parsing of the scraped content
          // This is a placeholder that would need actual parsing logic based on the website structure
          mobileHomes = parseOwnTruModels(markdown);
          scrapingSuccessful = true;
        }
      }
    } catch (firecrawlError) {
      console.error('Firecrawl scraping failed:', firecrawlError);
    }

    // If scraping failed, return an error
    if (!scrapingSuccessful || mobileHomes.length === 0) {
      console.log('Scraping failed or no models found');
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to scrape OwnTru models. Please check the Firecrawl API key and try again.',
        error: 'No models could be scraped from the website'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${mobileHomes.length} mobile homes...`);

    // Filter out SENSATION and SPLENDOR models
    const filteredHomes = mobileHomes.filter(home => 
      !['SENSATION', 'SPLENDOR'].includes(home.model.toUpperCase())
    );

    console.log(`After filtering out SENSATION and SPLENDOR: ${filteredHomes.length} homes to process`);

    // Update database
    let updatedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;

    for (const homeData of filteredHomes) {
      try {
        // Check if home already exists (excluding SENSATION and SPLENDOR)
        const { data: existingHome } = await supabase
          .from('mobile_homes')
          .select('id')
          .or(`display_name.ilike.%${homeData.display_name}%,model.ilike.%${homeData.model}%`)
          .maybeSingle();

        if (existingHome) {
          // Update existing home
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
          // Create new home
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
              price: 45000, // Default price
              minimum_profit: 7500, // Default profit
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
      message: `Successfully processed ${filteredHomes.length} mobile homes from scraping (excluded SENSATION and SPLENDOR). Created: ${createdCount}, Updated: ${updatedCount}`,
      data: {
        totalProcessed: filteredHomes.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        excludedModels: ['SENSATION', 'SPLENDOR'],
        homes: filteredHomes.map(h => ({
          display_name: h.display_name,
          model: h.model,
          square_footage: h.square_footage,
          bedrooms: h.bedrooms,
          bathrooms: h.bathrooms,
          dimensions: h.length_feet && h.width_feet ? `${h.width_feet}x${h.length_feet}` : null,
          features_count: h.features?.length || 0
        }))
      }
    };

    console.log('Operation completed:', result.message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to process OwnTru models'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to parse scraped markdown content
function parseOwnTruModels(markdown: string): MobileHomeData[] {
  const models: MobileHomeData[] = [];
  
  // This is a placeholder function that would need to be implemented
  // based on the actual structure of the scraped content
  // For now, return empty array since we need to see the actual scraped content
  // to implement proper parsing
  
  console.log('Parsing markdown content - this needs to be implemented based on actual scraped content structure');
  
  return models;
}
