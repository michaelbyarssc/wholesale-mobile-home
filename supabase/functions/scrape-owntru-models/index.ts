
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
        includeTags: ['h1', 'h2', 'h3', 'a', 'p', 'div', 'span', 'ul', 'li'],
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

    const mainMarkdown = mainPageData.data?.markdown || '';
    const mainHtml = mainPageData.data?.html || '';
    console.log('Main content lengths - Markdown:', mainMarkdown.length, 'HTML:', mainHtml.length);

    // Extract individual model URLs with comprehensive patterns
    const modelUrls = new Set<string>();
    const combinedContent = mainMarkdown + ' ' + mainHtml;
    
    console.log('Extracting model URLs from main page...');
    
    // Enhanced URL extraction patterns
    const urlPatterns = [
      /https:\/\/owntru\.com\/models\/([a-z0-9\-]+)/gi,
      /owntru\.com\/models\/([a-z0-9\-]+)/gi,
      /\/models\/([a-z0-9\-]+)/gi,
      /href="([^"]*\/models\/[a-z0-9\-]+[^"]*)"/gi,
      /\[([^\]]+)\]\(([^)]*\/models\/[a-z0-9\-]+[^)]*)\)/gi
    ];

    for (const pattern of urlPatterns) {
      let match;
      while ((match = pattern.exec(combinedContent)) !== null) {
        let url = match[0];
        
        // Extract the actual URL from different formats
        if (url.includes('href="')) {
          const hrefMatch = url.match(/href="([^"]+)"/);
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
            url = 'https://owntru.com/models/' + url;
          }
        }
        
        // Clean up URL
        url = url.replace(/\/$/, '').split('#')[0].split('?')[0];
        
        // Validate and add URL
        if (url.includes('/models/') && !url.endsWith('/models/')) {
          const modelSlug = url.split('/models/')[1];
          if (modelSlug && modelSlug.length > 2 && /^[a-z0-9\-]+$/.test(modelSlug)) {
            modelUrls.add(url);
            console.log('Found model URL:', url);
          }
        }
      }
    }

    // Remove duplicates and clean up URLs
    const uniqueUrls = Array.from(modelUrls);
    console.log(`Found ${uniqueUrls.length} unique model URLs`);
    uniqueUrls.forEach((url, index) => console.log(`${index + 1}: ${url}`));

    if (uniqueUrls.length === 0) {
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
            mainHtmlLength: mainHtml.length,
            sampleContent: combinedContent.substring(0, 500)
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process all models to get comprehensive data
    const mobileHomes: MobileHomeData[] = [];
    const maxModels = Math.min(uniqueUrls.length, 15); // Process up to 15 models
    let processedCount = 0;

    console.log(`Processing ${maxModels} models to capture all home details...`);

    for (let i = 0; i < maxModels; i++) {
      const modelUrl = uniqueUrls[i];
      
      try {
        console.log(`[${i + 1}/${maxModels}] Processing: ${modelUrl}`);
        
        // Scrape the main model page with extended wait time
        const modelPageResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: modelUrl,
            formats: ['markdown', 'html'],
            onlyMainContent: false, // Get all content
            includeTags: ['h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'ul', 'li', 'table', 'td', 'th', 'a', 'section', 'article'],
            excludeTags: ['nav', 'footer', 'script', 'style'],
            waitFor: 3000 // Increased wait time
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
        console.log(`Content lengths for ${modelUrl} - Markdown: ${modelMarkdown.length}, HTML: ${modelHtml.length}`);
        
        if (modelMarkdown.length < 100 && modelHtml.length < 500) {
          console.log(`Skipping ${modelUrl} - insufficient content`);
          continue;
        }

        // Extract model name from URL and content
        const urlParts = modelUrl.split('/');
        const urlModelName = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
        let modelName = urlModelName.replace(/-/g, ' ').toUpperCase();

        // Enhanced model name extraction from content
        const combinedModelContent = modelMarkdown + ' ' + modelHtml;
        const titlePatterns = [
          /<h1[^>]*>([^<]{3,25})<\/h1>/i,
          /<h2[^>]*>([^<]{3,25})<\/h2>/i,
          /^#\s+([A-Z][A-Z\s0-9]{2,25})$/m,
          /^##\s+([A-Z][A-Z\s0-9]{2,25})$/m,
          /\*\*([A-Z][A-Z\s0-9]{2,25})\*\*/,
          /title[:\s]*([A-Z][A-Z\s0-9]{2,25})/i,
          /model[:\s]*([A-Z][A-Z\s0-9]{2,25})/i
        ];

        for (const pattern of titlePatterns) {
          const titleMatch = combinedModelContent.match(pattern);
          if (titleMatch && titleMatch[1]) {
            const foundTitle = titleMatch[1].trim();
            if (foundTitle.length >= 3 && foundTitle.length <= 25 && 
                !foundTitle.toLowerCase().includes('owntru') && 
                !foundTitle.includes('www') && 
                !foundTitle.includes('.com')) {
              modelName = foundTitle;
              console.log(`Found title: ${modelName}`);
              break;
            }
          }
        }

        const modelData: MobileHomeData = {
          series: 'OwnTru',
          model: modelName.replace(/\s+/g, ''),
          display_name: modelName,
        };

        // Extract square footage with comprehensive patterns
        const sqftPatterns = [
          /(\d{3,4})\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet|SF)\b/gi,
          /(?:size|area|footage|square\s*footage)[:\s]*(\d{3,4})/gi,
          /total\s*(?:area|size|footage)[:\s]*(\d{3,4})/gi,
          /<td[^>]*>(\d{3,4})[^<]*(?:sq|ft)/gi,
          /(\d{3,4})\s*sq/gi,
          /floor\s*plan[:\s]*(\d{3,4})/gi
        ];

        let sqftFound = false;
        for (const pattern of sqftPatterns) {
          pattern.lastIndex = 0; // Reset regex
          const sqftMatch = pattern.exec(combinedModelContent);
          if (sqftMatch) {
            const sqft = parseInt(sqftMatch[1]);
            if (sqft >= 300 && sqft <= 3000) {
              modelData.square_footage = sqft;
              console.log(`Found square footage: ${modelData.square_footage}`);
              sqftFound = true;
              break;
            }
          }
        }

        // Extract bedrooms
        const bedroomPatterns = [
          /(\d+)\s*(?:bed|bedroom|br)\b/gi,
          /(?:bed|bedroom|br)[:\s]*(\d+)/gi,
          /<td[^>]*>(\d+)[^<]*bed/gi,
          /bedrooms?[:\s]*(\d+)/gi
        ];

        let bedroomFound = false;
        for (const pattern of bedroomPatterns) {
          pattern.lastIndex = 0;
          const bedroomMatch = pattern.exec(combinedModelContent);
          if (bedroomMatch) {
            const bedrooms = parseInt(bedroomMatch[1]);
            if (bedrooms >= 1 && bedrooms <= 6) {
              modelData.bedrooms = bedrooms;
              console.log(`Found bedrooms: ${modelData.bedrooms}`);
              bedroomFound = true;
              break;
            }
          }
        }

        // Extract bathrooms
        const bathroomPatterns = [
          /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)\b/gi,
          /(?:bath|bathroom|ba)[:\s]*(\d+(?:\.\d+)?)/gi,
          /<td[^>]*>(\d+(?:\.\d+)?)[^<]*bath/gi,
          /bathrooms?[:\s]*(\d+(?:\.\d+)?)/gi
        ];

        let bathroomFound = false;
        for (const pattern of bathroomPatterns) {
          pattern.lastIndex = 0;
          const bathroomMatch = pattern.exec(combinedModelContent);
          if (bathroomMatch) {
            const bathrooms = parseFloat(bathroomMatch[1]);
            if (bathrooms >= 1 && bathrooms <= 4) {
              modelData.bathrooms = bathrooms;
              console.log(`Found bathrooms: ${modelData.bathrooms}`);
              bathroomFound = true;
              break;
            }
          }
        }

        // Extract dimensions with enhanced patterns
        const dimensionPatterns = [
          /(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)(?:\s*ft|\s*feet)?/gi,
          /(?:dimensions|size)[:\s]*(\d+)(?:\s*[x×]\s*|\s+by\s+)(\d+)/gi,
          /(\d+)'?\s*x\s*(\d+)'/gi,
          /<td[^>]*>(\d+)[^<]*x[^<]*(\d+)/gi,
          /length[:\s]*(\d+)[^0-9]*width[:\s]*(\d+)/gi,
          /width[:\s]*(\d+)[^0-9]*length[:\s]*(\d+)/gi,
          /(\d+)\s*ft\s*x\s*(\d+)\s*ft/gi,
          /exterior[:\s]*(\d+)[^0-9]*x[^0-9]*(\d+)/gi
        ];

        let dimensionFound = false;
        for (const pattern of dimensionPatterns) {
          pattern.lastIndex = 0;
          const dimensionMatch = pattern.exec(combinedModelContent);
          if (dimensionMatch) {
            const dim1 = parseInt(dimensionMatch[1]);
            const dim2 = parseInt(dimensionMatch[2]);
            if (dim1 >= 12 && dim1 <= 32 && dim2 >= 40 && dim2 <= 80) {
              modelData.width_feet = Math.min(dim1, dim2);
              modelData.length_feet = Math.max(dim1, dim2);
              console.log(`Found dimensions: ${modelData.width_feet}x${modelData.length_feet}`);
              dimensionFound = true;
              break;
            }
          }
        }

        // Extract description with enhanced patterns
        const descriptionPatterns = [
          /(?:about|description|overview|details)[:\s]*([^.\n\r]{50,500}\.?)/gi,
          /^([A-Z][^.\n\r]{50,500}\.)/m,
          /<p[^>]*>([^<]{50,500}\.?)<\/p>/gi,
          /\*\*[^*]+\*\*\s*([^.\n\r]{50,500}\.)/gi,
          /(?:The\s+[A-Z][a-z]+|This\s+[a-z]+)([^.\n\r]{30,400}\.)/gi
        ];

        let descriptionFound = false;
        for (const pattern of descriptionPatterns) {
          pattern.lastIndex = 0;
          const descMatch = pattern.exec(combinedModelContent);
          if (descMatch && descMatch[1]) {
            let desc = descMatch[1].trim().replace(/[*#\[\]]/g, '').replace(/\s+/g, ' ');
            if (desc.length > 30 && desc.length < 600 && 
                !desc.includes('owntru.com') && 
                !desc.includes('href=') && 
                !desc.includes('](') &&
                !desc.toLowerCase().includes('cookie') &&
                !desc.toLowerCase().includes('website') &&
                !desc.includes('/most-affordable-homes-in-amercia/')) {
              modelData.description = desc;
              console.log(`Found description: ${modelData.description.substring(0, 80)}...`);
              descriptionFound = true;
              break;
            }
          }
        }

        // Extract features with comprehensive patterns
        const featurePatterns = [
          /(?:features|includes|amenities|highlights)[:\s]*([^.\n\r]+(?:\.[^.\n\r]+)*)/gi,
          /•\s*([^.\n\r]{10,120})/g,
          /-\s*([^.\n\r]{10,120})/g,
          /\*\s*([^.\n\r]{10,120})/g,
          /<li[^>]*>([^<]{10,120})<\/li>/gi,
          /^\s*-\s*([^.\n\r]{10,120})$/gm,
          /([A-Z][a-z]+\s+[a-z]+(?:\s+[a-z]+)*(?:\s+with\s+[^.\n\r]+)?)/g
        ];

        const features: string[] = [];
        for (const pattern of featurePatterns) {
          if (pattern.global) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(combinedModelContent)) !== null && features.length < 10) {
              const feature = match[1].trim().replace(/[*#<>]/g, '').replace(/\s+/g, ' ');
              if (feature.length > 8 && feature.length < 120 && 
                  !features.some(f => f.toLowerCase().includes(feature.toLowerCase()) || feature.toLowerCase().includes(f.toLowerCase())) && 
                  !feature.includes('owntru.com') && 
                  !feature.includes('href=') &&
                  !feature.toLowerCase().includes('cookie') &&
                  /[a-zA-Z]/.test(feature)) {
                features.push(feature);
              }
            }
          } else {
            const match = combinedModelContent.match(pattern);
            if (match && match[1]) {
              const featureText = match[1].trim();
              const splitFeatures = featureText.split(/[,;]/).map(f => f.trim().replace(/[*#<>]/g, '')).filter(f => f.length > 8);
              features.push(...splitFeatures.slice(0, 6));
              break;
            }
          }
        }

        if (features.length > 0) {
          modelData.features = [...new Set(features)].slice(0, 10);
          console.log(`Found ${features.length} features:`, features.slice(0, 3));
        }

        // Try to get more info from sales sheet or "tell me more" sections
        if (!descriptionFound || !sqftFound || !bedroomFound || !bathroomFound || !dimensionFound) {
          console.log(`Missing data for ${modelName}, looking for additional content...`);
          
          // Look for links to more detailed pages
          const detailLinkPatterns = [
            /href="([^"]*(?:about|details|specs|sales|sheet)[^"]*)"/gi,
            /\[([^\]]*(?:tell\s*me\s*more|more\s*info|sales\s*sheet|download)[^\]]*)\]\(([^)]+)\)/gi
          ];

          const detailUrls = new Set<string>();
          for (const pattern of detailLinkPatterns) {
            let match;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(combinedModelContent)) !== null) {
              let detailUrl = match[1] || match[2] || match[3];
              if (detailUrl && !detailUrl.startsWith('#')) {
                if (!detailUrl.startsWith('http')) {
                  detailUrl = new URL(detailUrl, modelUrl).href;
                }
                detailUrls.add(detailUrl);
              }
            }
          }

          // Also try the /about endpoint
          detailUrls.add(modelUrl + '/about');
          
          console.log(`Found ${detailUrls.size} potential detail URLs for ${modelName}`);
          
          for (const detailUrl of Array.from(detailUrls).slice(0, 2)) { // Limit to 2 additional pages
            try {
              console.log(`Scraping detail page: ${detailUrl}`);
              
              const detailResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${firecrawlApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: detailUrl,
                  formats: ['markdown', 'html'],
                  onlyMainContent: true,
                  includeTags: ['h1', 'h2', 'h3', 'h4', 'p', 'div', 'span', 'ul', 'li', 'table', 'td', 'th', 'section'],
                  excludeTags: ['nav', 'footer', 'script', 'style'],
                  waitFor: 2000
                })
              });

              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                if (detailData.success) {
                  const detailMarkdown = detailData.data?.markdown || '';
                  const detailHtml = detailData.data?.html || '';
                  const detailContent = detailMarkdown + ' ' + detailHtml;
                  
                  console.log(`Detail page content length: ${detailContent.length}`);
                  
                  if (detailContent.length > 100) {
                    // Try to extract missing data from detail page
                    if (!modelData.square_footage) {
                      for (const pattern of sqftPatterns) {
                        pattern.lastIndex = 0;
                        const sqftMatch = pattern.exec(detailContent);
                        if (sqftMatch) {
                          const sqft = parseInt(sqftMatch[1]);
                          if (sqft >= 300 && sqft <= 3000) {
                            modelData.square_footage = sqft;
                            console.log(`Found square footage from detail page: ${sqft}`);
                            break;
                          }
                        }
                      }
                    }
                    
                    if (!modelData.description) {
                      for (const pattern of descriptionPatterns) {
                        pattern.lastIndex = 0;
                        const descMatch = pattern.exec(detailContent);
                        if (descMatch && descMatch[1]) {
                          let desc = descMatch[1].trim().replace(/[*#\[\]]/g, '').replace(/\s+/g, ' ');
                          if (desc.length > 30 && desc.length < 600 && 
                              !desc.includes('owntru.com') && 
                              !desc.includes('href=') && 
                              !desc.includes('](') &&
                              !desc.toLowerCase().includes('cookie') &&
                              !desc.includes('/most-affordable-homes-in-amercia/')) {
                            modelData.description = desc;
                            console.log(`Found description from detail page: ${desc.substring(0, 80)}...`);
                            break;
                          }
                        }
                      }
                    }
                  }
                }
              }
              
              // Small delay between detail page requests
              await new Promise(resolve => setTimeout(resolve, 500));
              
            } catch (detailError) {
              console.log(`Could not scrape detail page ${detailUrl}:`, detailError);
            }
          }
        }

        mobileHomes.push(modelData);
        console.log(`Successfully processed model: ${modelName} with data:`, {
          sqft: modelData.square_footage,
          bed: modelData.bedrooms,
          bath: modelData.bathrooms,
          dimensions: modelData.length_feet && modelData.width_feet ? `${modelData.width_feet}x${modelData.length_feet}` : null,
          features: modelData.features?.length || 0,
          hasDescription: !!modelData.description
        });
        processedCount++;

        // Delay between main requests
        await new Promise(resolve => setTimeout(resolve, 1500));

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
