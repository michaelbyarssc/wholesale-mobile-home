
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

    // Use Firecrawl to scrape the OwnTru models page with better options
    console.log('Making request to Firecrawl API...');
    
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
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
        waitFor: 2000 // Wait for dynamic content to load
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl API error:', firecrawlResponse.status, errorText);
      throw new Error(`Firecrawl API error: ${firecrawlResponse.status} ${firecrawlResponse.statusText}`);
    }

    const firecrawlData = await firecrawlResponse.json();
    console.log('Firecrawl response received');
    
    if (!firecrawlData.success) {
      throw new Error(`Firecrawl failed: ${firecrawlData.error || 'Unknown error'}`);
    }

    const content = firecrawlData.data?.content || '';
    const markdown = firecrawlData.data?.markdown || '';
    
    console.log('Content length:', content.length);
    console.log('Markdown length:', markdown.length);
    console.log('First 500 chars of content:', content.substring(0, 500));
    console.log('First 500 chars of markdown:', markdown.substring(0, 500));

    // Parse the scraped data to extract mobile home information
    const mobileHomes: MobileHomeData[] = [];
    
    // Try to extract model information from both content and markdown
    const textToAnalyze = markdown.length > content.length ? markdown : content;
    
    console.log('Analyzing text for mobile home models...');
    
    // Look for model patterns in the text
    const modelPatterns = [
      // Look for headings that might be model names
      /^#{1,4}\s+([A-Z][a-zA-Z\s]+?)(?:\s*-|\s*\n|$)/gm,
      // Look for strong/bold text that might be model names
      /\*\*([A-Z][a-zA-Z\s]+?)\*\*/g,
      // Look for text followed by square footage
      /([A-Z][a-zA-Z\s]+?)\s+(\d{3,4})\s*(?:sq\.?\s*ft|sqft)/gi,
      // Look for bedroom/bathroom patterns
      /([A-Z][a-zA-Z\s]+?)\s+(\d+)\s*bed.*?(\d+)\s*bath/gi
    ];

    const foundModels = new Set<string>();
    
    for (const pattern of modelPatterns) {
      let match;
      while ((match = pattern.exec(textToAnalyze)) !== null) {
        const modelName = match[1].trim();
        console.log('Found potential model:', modelName);
        
        if (modelName.length > 2 && modelName.length < 50 && !foundModels.has(modelName)) {
          foundModels.add(modelName);
          
          const modelData: MobileHomeData = {
            series: 'OwnTru',
            model: modelName.replace(/\s+/g, ''),
            display_name: modelName,
          };

          // Try to extract additional details for this model
          const modelContext = textToAnalyze.substring(
            Math.max(0, match.index - 200), 
            Math.min(textToAnalyze.length, match.index + 500)
          );
          
          console.log('Model context for', modelName, ':', modelContext.substring(0, 200));

          // Extract square footage
          const sqftMatch = modelContext.match(/(\d{3,4})\s*(?:sq\.?\s*ft|sqft)/i);
          if (sqftMatch) {
            modelData.square_footage = parseInt(sqftMatch[1]);
            console.log('Found square footage:', modelData.square_footage);
          }

          // Extract bedrooms
          const bedroomMatch = modelContext.match(/(\d+)\s*(?:bed|bedroom)/i);
          if (bedroomMatch) {
            modelData.bedrooms = parseInt(bedroomMatch[1]);
            console.log('Found bedrooms:', modelData.bedrooms);
          }

          // Extract bathrooms
          const bathroomMatch = modelContext.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom)/i);
          if (bathroomMatch) {
            modelData.bathrooms = parseFloat(bathroomMatch[1]);
            console.log('Found bathrooms:', modelData.bathrooms);
          }

          // Extract dimensions
          const dimensionMatch = modelContext.match(/(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)(?:\s*ft)?/i);
          if (dimensionMatch) {
            modelData.width_feet = parseInt(dimensionMatch[1]);
            modelData.length_feet = parseInt(dimensionMatch[2]);
            console.log('Found dimensions:', `${modelData.width_feet}x${modelData.length_feet}`);
          }

          mobileHomes.push(modelData);
          console.log('Added mobile home:', modelData.display_name);
        }
      }
    }

    console.log(`Extracted ${mobileHomes.length} mobile homes from scraped data`);

    // If we didn't find any models, let's try a different approach
    if (mobileHomes.length === 0) {
      console.log('No models found with standard patterns, trying alternative extraction...');
      
      // Look for any text that might contain model information
      const lines = textToAnalyze.split('\n').filter(line => line.trim().length > 0);
      
      for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const line = lines[i].trim();
        console.log(`Line ${i}:`, line.substring(0, 100));
        
        // Look for lines that might be model names (capitalized words)
        if (/^[A-Z][a-zA-Z\s]{3,30}$/.test(line) && !line.includes('http') && !line.includes('@')) {
          console.log('Potential model found in line:', line);
          
          const modelData: MobileHomeData = {
            series: 'OwnTru',
            model: line.replace(/\s+/g, ''),
            display_name: line,
          };
          
          mobileHomes.push(modelData);
        }
      }
    }

    if (mobileHomes.length === 0) {
      console.log('Still no models found. Raw content analysis:');
      console.log('Content includes "model":', content.toLowerCase().includes('model'));
      console.log('Content includes "home":', content.toLowerCase().includes('home'));
      console.log('Content includes "bedroom":', content.toLowerCase().includes('bedroom'));
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Scrape completed but no mobile homes were found. The website structure may have changed or content may be dynamically loaded.',
        data: {
          totalProcessed: 0,
          created: 0,
          updated: 0,
          homes: [],
          debugInfo: {
            contentLength: content.length,
            markdownLength: markdown.length,
            hasModelKeyword: content.toLowerCase().includes('model'),
            hasHomeKeyword: content.toLowerCase().includes('home'),
            firstLines: textToAnalyze.split('\n').slice(0, 10)
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
