
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
  features?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting TrueMobileHomes models scraping...');
    
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
          url: 'https://www.truemobilehomes.com/',
          formats: ['markdown'],
          onlyMainContent: true,
          timeout: 30000
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.markdown) {
          console.log('Successfully scraped TrueMobileHomes page');
          
          const markdown = data.data.markdown;
          console.log('Scraped content length:', markdown.length);
          console.log('Content sample:', markdown.substring(0, 500));
          
          // Parse the scraped content with simplified logic
          mobileHomes = parseTrueMobileHomes(markdown);
          console.log(`Parsed ${mobileHomes.length} models from scraped content`);
          
          if (mobileHomes.length > 0) {
            scrapingSuccessful = true;
          }
        }
      } else {
        console.error('Firecrawl API response not ok:', response.status, response.statusText);
      }
    } catch (firecrawlError) {
      console.error('Firecrawl scraping failed:', firecrawlError);
    }

    // If scraping failed, return an error
    if (!scrapingSuccessful || mobileHomes.length === 0) {
      console.log('Scraping failed or no models found');
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to scrape TrueMobileHomes models. Please check the Firecrawl API key and try again.',
        error: 'No models could be scraped from the website'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${mobileHomes.length} mobile homes...`);

    // Update database
    let updatedCount = 0;
    let createdCount = 0;

    for (const homeData of mobileHomes) {
      try {
        // Check if home already exists
        const { data: existingHome } = await supabase
          .from('mobile_homes')
          .select('id')
          .or(`display_name.ilike.%${homeData.display_name}%,model.ilike.%${homeData.model}%`)
          .maybeSingle();

        if (existingHome) {
          // Update existing home - only description and features
          const { error } = await supabase
            .from('mobile_homes')
            .update({
              series: homeData.series,
              model: homeData.model,
              display_name: homeData.display_name,
              description: homeData.description,
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
          // Create new home - only with description and features
          const { data: maxOrder } = await supabase
            .from('mobile_homes')
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1);

          const nextOrder = (maxOrder?.[0]?.display_order || 0) + 1;

          const { error } = await supabase
            .from('mobile_homes')
            .insert({
              manufacturer: 'TrueMobileHomes',
              series: homeData.series,
              model: homeData.model,
              display_name: homeData.display_name,
              description: homeData.description,
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
      message: `Successfully processed ${mobileHomes.length} mobile homes from TrueMobileHomes scraping. Created: ${createdCount}, Updated: ${updatedCount}`,
      data: {
        totalProcessed: mobileHomes.length,
        created: createdCount,
        updated: updatedCount,
        homes: mobileHomes.map(h => ({
          display_name: h.display_name,
          model: h.model,
          description: h.description,
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
      message: 'Failed to process TrueMobileHomes models'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Simplified helper function to parse scraped markdown content from TrueMobileHomes
function parseTrueMobileHomes(markdown: string): MobileHomeData[] {
  const models: MobileHomeData[] = [];
  
  console.log('Starting to parse TrueMobileHomes markdown content');
  
  try {
    // Split content into sections and look for patterns
    const lines = markdown.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentSeries = '';
    let currentModel: Partial<MobileHomeData> = {};
    let isInModelSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      // Look for series patterns - common mobile home series names
      if (line.match(/^#+\s*(Single|Double|Triple|Multi|Wide|Homes?|Series|Collection|Line)\s*/i) ||
          line.match(/^(Single Wide|Double Wide|Triple Wide|Multi-Section)/i)) {
        const seriesMatch = line.match(/^#+\s*([A-Za-z\s]+)/) || line.match(/^([A-Za-z\s]+)/);
        if (seriesMatch) {
          currentSeries = seriesMatch[1].trim();
          console.log(`Found series: ${currentSeries}`);
        }
        continue;
      }
      
      // Look for model names in various formats
      let modelMatch = null;
      
      // Try different patterns for model names
      modelMatch = line.match(/^#+\s*([A-Z][A-Z0-9\s\-]+)$/) || 
                  line.match(/^\*\*([A-Z][A-Z0-9\s\-]+)\*\*$/) ||
                  line.match(/^([A-Z][A-Z0-9\s\-]{2,})$/) ||
                  line.match(/^Model:\s*([A-Z][A-Z0-9\s\-]+)$/i) ||
                  line.match(/^([A-Z]+\s*\d+[A-Z]*)\s*$/);
      
      if (modelMatch && currentSeries) {
        // Save previous model if exists
        if (currentModel.model && currentModel.series) {
          const completedModel = createModelData(currentModel);
          models.push(completedModel);
        }
        
        // Start new model
        const modelName = modelMatch[1].trim();
        
        currentModel = {
          series: currentSeries,
          model: modelName,
          display_name: `${currentSeries} ${modelName}`,
          features: []
        };
        isInModelSection = true;
        console.log(`Found model: ${modelName} in ${currentSeries} series`);
        continue;
      }
      
      // Extract only description and features when we're in a model section
      if (isInModelSection && currentModel.model) {
        // Features (bullet points, dashes, or structured lists)
        if (line.match(/^[\-\*•·]\s*(.+)$/) || line.match(/^\d+\.\s*(.+)$/)) {
          const feature = line.replace(/^[\-\*•·\d\.]\s*/, '').trim();
          if (feature && feature.length > 3) {
            currentModel.features = currentModel.features || [];
            if (!currentModel.features.includes(feature)) {
              currentModel.features.push(feature);
            }
          }
        }
        
        // Description (longer descriptive text)
        if (line.length > 30 && !line.includes(':') && !line.match(/^[\-\*•#\d]/) && 
            line.match(/[a-z]/) && !line.match(/\d+\s*(sq|bed|bath|x|×)/i)) {
          if (!currentModel.description) {
            currentModel.description = line;
          }
        }
      }
    }
    
    // Don't forget the last model
    if (currentModel.model && currentModel.series) {
      const completedModel = createModelData(currentModel);
      models.push(completedModel);
    }
    
    console.log(`Successfully parsed ${models.length} models`);
    return models;
    
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return [];
  }
}

function createModelData(model: Partial<MobileHomeData>): MobileHomeData {
  return {
    series: model.series || 'Unknown',
    model: model.model || 'Unknown',
    display_name: model.display_name || `${model.series} ${model.model}`,
    description: model.description,
    features: model.features || []
  };
}
