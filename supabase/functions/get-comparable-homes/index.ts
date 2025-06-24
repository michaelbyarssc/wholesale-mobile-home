
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ComparableHomeRequest {
  address: string;
  bedrooms: number;
  bathrooms: number;
  radius: number; // in miles
}

interface ComparableHome {
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage?: number;
  listingDate?: string;
  zpid?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address, bedrooms, bathrooms, radius }: ComparableHomeRequest = await req.json()

    console.log('Searching for comparable homes:', { address, bedrooms, bathrooms, radius })

    // Using RealtyMole API which has a free tier
    const realtyMoleApiKey = Deno.env.get('REALTY_MOLE_API_KEY')
    
    if (!realtyMoleApiKey) {
      console.log('No RealtyMole API key found, using mock data')
      
      // Return mock data for development/testing
      const mockComps: ComparableHome[] = [
        {
          address: "123 Mobile Home Dr, Sample County, NC",
          price: 45000,
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          squareFootage: 1200,
          listingDate: "2024-12-15"
        },
        {
          address: "456 Manufactured Ln, Sample County, NC",
          price: 52000,
          bedrooms: bedrooms + 1,
          bathrooms: bathrooms,
          squareFootage: 1350,
          listingDate: "2024-12-10"
        },
        {
          address: "789 Trailer Park Ave, Sample County, NC",
          price: 38000,
          bedrooms: bedrooms - 1,
          bathrooms: bathrooms - 1,
          squareFootage: 950,
          listingDate: "2024-12-20"
        }
      ]

      return new Response(
        JSON.stringify({ 
          success: true, 
          comparables: mockComps,
          source: 'mock_data'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // RealtyMole API implementation
    const searchUrl = `https://realty-mole-property-api.p.rapidapi.com/properties`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': realtyMoleApiKey,
        'X-RapidAPI-Host': 'realty-mole-property-api.p.rapidapi.com'
      }
    })

    if (!response.ok) {
      throw new Error(`RealtyMole API error: ${response.status}`)
    }

    const data = await response.json()
    console.log('RealtyMole API response:', data)

    // Filter and format the results
    const comparables: ComparableHome[] = (data.properties || [])
      .filter((property: any) => {
        const propBeds = property.bedrooms || 0
        const propBaths = property.bathrooms || 0
        
        // Match bedrooms +/- 1 and bathrooms +/- 1
        return Math.abs(propBeds - bedrooms) <= 1 && 
               Math.abs(propBaths - bathrooms) <= 1 &&
               property.propertyType?.toLowerCase().includes('mobile') ||
               property.propertyType?.toLowerCase().includes('manufactured')
      })
      .slice(0, 5) // Top 5 results
      .map((property: any) => ({
        address: `${property.address}, ${property.city}, ${property.state}`,
        price: property.price || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFootage: property.squareFootage,
        listingDate: property.listDate
      }))

    return new Response(
      JSON.stringify({ 
        success: true, 
        comparables,
        source: 'realty_mole'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error fetching comparable homes:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
