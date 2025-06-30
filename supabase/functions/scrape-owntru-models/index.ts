
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
    console.log('Starting OwnTru models scraping with direct PDF parsing...');
    
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
    
    // Helper function to extract PDF URL from page content
    const extractPDFUrl = (content: string, htmlContent: string): string | null => {
      // Look for PDF links in both markdown and HTML content
      const pdfLinkPatterns = [
        /https:\/\/owntru\.com\/wp-content\/uploads\/[^"'\s]*\.pdf/gi,
        /href="([^"]*\.pdf[^"]*)"/gi,
        /\[([^\]]*)\]\(([^)]*\.pdf[^)]*)\)/gi
      ];

      for (const pattern of pdfLinkPatterns) {
        const matches = [...content.matchAll(pattern), ...htmlContent.matchAll(pattern)];
        
        for (const match of matches) {
          let pdfUrl = null;
          
          // Extract PDF URL from different match groups
          if (match[0] && match[0].includes('.pdf')) {
            pdfUrl = match[0].replace(/['"]/g, '');
          } else if (match[1] && match[1].includes('.pdf')) {
            pdfUrl = match[1];
          } else if (match[2] && match[2].includes('.pdf')) {
            pdfUrl = match[2];
          }
          
          if (pdfUrl && pdfUrl.startsWith('https://owntru.com/wp-content/uploads/')) {
            console.log(`Found PDF URL: ${pdfUrl}`);
            return pdfUrl;
          }
        }
      }
      
      return null;
    };

    // Helper function to parse PDF content and extract data
    const parsePDFContent = async (pdfUrl: string): Promise<Partial<MobileHomeData>> => {
      try {
        console.log(`Scraping PDF content from: ${pdfUrl}`);
        
        // Use Firecrawl to scrape the PDF directly
        const pdfResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: pdfUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            waitFor: 3000,
            timeout: 30000,
            removeBase64Images: true
          })
        });

        if (!pdfResponse.ok) {
          console.error(`Failed to scrape PDF ${pdfUrl} (${pdfResponse.status})`);
          return {};
        }

        const pdfData = await pdfResponse.json();
        if (!pdfData.success) {
          console.error(`PDF scrape error for ${pdfUrl}:`, pdfData);
          return {};
        }

        const pdfContent = pdfData.data?.markdown || '';
        console.log(`PDF content length: ${pdfContent.length} chars`);
        console.log(`PDF sample content:`, pdfContent.substring(0, 500));

        const extractedData: Partial<MobileHomeData> = {};

        // Extract model name from PDF filename or content
        const urlParts = pdfUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const modelNameMatch = filename.match(/_([A-Z][A-Z\s]+)\.pdf$/i);
        if (modelNameMatch) {
          extractedData.display_name = modelNameMatch[1].replace(/_/g, ' ').trim();
          extractedData.model = extractedData.display_name.toLowerCase().replace(/\s+/g, '-');
          console.log(`Extracted model name from PDF filename: ${extractedData.display_name}`);
        }

        // Extract specifications from PDF content
        // Look for patterns like "1,791 SQ FT", "4 BEDROOMS", "2 BATHROOMS", "28' x 68'"
        
        // Square footage
        const sqftMatches = pdfContent.match(/(\d{1,2},?\d{3})\s*(?:SQ\.?\s*FT\.?|SQUARE\s+FEET?)/gi);
        if (sqftMatches) {
          const sqft = parseInt(sqftMatches[0].replace(/[^\d]/g, ''));
          if (sqft >= 500 && sqft <= 3000) {
            extractedData.square_footage = sqft;
            console.log(`Extracted square footage from PDF: ${sqft}`);
          }
        }

        // Bedrooms
        const bedroomMatches = pdfContent.match/(\d+)\s*(?:BEDROOM|BED)S?/gi);
        if (bedroomMatches) {
          const beds = parseInt(bedroomMatches[0].match(/\d+/)?.[0] || '0');
          if (beds >= 1 && beds <= 6) {
            extractedData.bedrooms = beds;
            console.log(`Extracted bedrooms from PDF: ${beds}`);
          }
        }

        // Bathrooms  
        const bathroomMatches = pdfContent.match(/(\d+(?:\.\d+)?)\s*(?:BATHROOM|BATH)S?/gi);
        if (bathroomMatches) {
          const baths = parseFloat(bathroomMatches[0].match(/\d+(?:\.\d+)?/)?.[0] || '0');
          if (baths >= 0.5 && baths <= 5) {
            extractedData.bathrooms = baths;
            console.log(`Extracted bathrooms from PDF: ${baths}`);
          }
        }

        // Dimensions - look for patterns like "28' x 68'" or "28 x 68"
        const dimensionMatches = pdfContent.match(/(\d{2})['']?\s*[x×]\s*(\d{2})['']?/gi);
        if (dimensionMatches) {
          const match = dimensionMatches[0];
          const parts = match.split(/[x×]/i);
          const dim1 = parseInt(parts[0]?.replace(/[^\d]/g, '') || '0');
          const dim2 = parseInt(parts[1]?.replace(/[^\d]/g, '') || '0');
          
          if (dim1 >= 12 && dim1 <= 32 && dim2 >= 40 && dim2 <= 90) {
            extractedData.width_feet = dim1;
            extractedData.length_feet = dim2;
            console.log(`Extracted dimensions from PDF: ${dim1}x${dim2}`);
          }
        }

        // Extract features - look for bullet points and feature lists
        const features: string[] = [];
        const featureKeywords = [
          'kitchen', 'cabinet', 'counter', 'appliance', 'island', 'pantry',
          'bathroom', 'shower', 'tub', 'vanity', 'master', 'suite',
          'bedroom', 'closet', 'storage', 'living', 'dining', 'room',
          'flooring', 'vinyl', 'carpet', 'tile', 'wood', 'laminate',
          'window', 'door', 'ceiling', 'wall', 'energy', 'efficient'
        ];

        // Look for bullet points or list items
        const lines = pdfContent.split('\n');
        for (const line of lines) {
          const cleanLine = line.trim().replace(/^[\s\*\-•]\s*/, '');
          
          if (cleanLine.length >= 10 && cleanLine.length <= 100) {
            const hasFeatureKeyword = featureKeywords.some(keyword => 
              cleanLine.toLowerCase().includes(keyword)
            );
            
            if (hasFeatureKeyword && 
                !cleanLine.toLowerCase().includes('owntru') &&
                !cleanLine.toLowerCase().includes('http') &&
                !features.includes(cleanLine) &&
                features.length < 10) {
              features.push(cleanLine);
              console.log(`Extracted feature from PDF: ${cleanLine}`);
            }
          }
        }

        if (features.length > 0) {
          extractedData.features = features;
        }

        // Extract description - look for descriptive paragraphs
        const contentLines = pdfContent.split('\n');
        for (const line of contentLines) {
          const cleanLine = line.trim();
          
          if (cleanLine.length >= 50 && cleanLine.length <= 300 &&
              !cleanLine.toLowerCase().includes('owntru.com') &&
              !cleanLine.toLowerCase().includes('sq ft') &&
              !cleanLine.toLowerCase().includes('bedroom') &&
              !cleanLine.toLowerCase().includes('bathroom') &&
              cleanLine.match(/[a-z]/) &&
              cleanLine.split(' ').length >= 8) {
            extractedData.description = cleanLine;
            console.log(`Extracted description from PDF: ${cleanLine.substring(0, 100)}...`);
            break;
          }
        }

        return extractedData;

      } catch (error) {
        console.error(`Error parsing PDF ${pdfUrl}:`, error);
        return {};
      }
    };
    
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
        
        // First scrape the model page to find the PDF URL
        const modelResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: modelUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: true,
            waitFor: 5000,
            timeout: 30000,
            removeBase64Images: true,
            actions: [{
              type: 'wait',
              milliseconds: 3000
            }]
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
        const htmlContent = modelData.data?.html || '';
        
        // Extract PDF URL from the page
        const pdfUrl = extractPDFUrl(content, htmlContent);
        if (!pdfUrl) {
          console.log(`No PDF found for ${modelUrl}, skipping`);
          continue;
        }

        // Add another delay before PDF scraping
        console.log(`Waiting ${DELAY_BETWEEN_REQUESTS/1000} seconds before PDF scraping...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));

        // Parse the PDF to extract all data
        const pdfData = await parsePDFContent(pdfUrl);

        // Create the mobile home data object
        const urlParts = modelUrl.split('/');
        const urlSlug = urlParts[urlParts.length - 1];
        
        const homeData: MobileHomeData = {
          series: 'OwnTru',
          model: pdfData.model || urlSlug,
          display_name: pdfData.display_name || urlSlug.toUpperCase(),
          description: pdfData.description,
          square_footage: pdfData.square_footage,
          bedrooms: pdfData.bedrooms,
          bathrooms: pdfData.bathrooms,
          length_feet: pdfData.length_feet,
          width_feet: pdfData.width_feet,
          features: pdfData.features,
        };

        mobileHomes.push(homeData);
        console.log(`Successfully processed: ${homeData.display_name}`);
        console.log('Final data summary:', {
          name: homeData.display_name,
          model: homeData.model,
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

    console.log(`Successfully extracted ${mobileHomes.length} mobile homes from PDFs`);

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
      message: `Successfully processed ${mobileHomes.length} mobile homes from PDFs. Created: ${createdCount}, Updated: ${updatedCount}`,
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

    console.log('PDF scraping completed:', result.message);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('PDF scraping error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to scrape OwnTru models from PDFs'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
