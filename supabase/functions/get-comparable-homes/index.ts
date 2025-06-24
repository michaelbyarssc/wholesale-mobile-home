
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

    // Using Rentcast API
    const rentcastApiKey = Deno.env.get('RENTCAST_API_KEY')
    
    if (!rentcastApiKey) {
      throw new Error('Rentcast API key not configured')
    }

    // Clean and format the address for better geocoding success
    const cleanAddress = address.trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/,?\s*SC\s*/i, ', SC ') // Ensure proper SC formatting
      .replace(/,?\s*South Carolina\s*/i, ', SC ') // Replace South Carolina with SC

    console.log('Cleaned address for geocoding:', cleanAddress)

    // First, get coordinates for the address using Rentcast's geocoding
    const geocodeUrl = `https://api.rentcast.io/v1/geocode?query=${encodeURIComponent(cleanAddress)}`
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'X-API-Key': rentcastApiKey,
        'accept': 'application/json'
      }
    })

    console.log('Geocoding response status:', geocodeResponse.status)

    if (!geocodeResponse.ok) {
      // Try with just city, state if full address fails
      const addressParts = cleanAddress.split(',')
      if (addressParts.length >= 2) {
        const cityState = addressParts.slice(-2).join(',').trim()
        console.log('Trying with city/state only:', cityState)
        
        const fallbackGeocodeUrl = `https://api.rentcast.io/v1/geocode?query=${encodeURIComponent(cityState)}`
        const fallbackResponse = await fetch(fallbackGeocodeUrl, {
          headers: {
            'X-API-Key': rentcastApiKey,
            'accept': 'application/json'
          }
        })
        
        if (!fallbackResponse.ok) {
          throw new Error(`Unable to geocode address. Please try a different format (e.g., "City, State" or "City, State ZIP").`)
        }
        
        const fallbackData = await fallbackResponse.json()
        console.log('Fallback geocoding response:', fallbackData)
        
        if (!fallbackData.latitude || !fallbackData.longitude) {
          throw new Error('Could not find coordinates for the provided location')
        }
        
        const { latitude, longitude } = fallbackData
        return await searchProperties(latitude, longitude, radius, bedrooms, bathrooms, rentcastApiKey)
      } else {
        throw new Error(`Unable to geocode address: ${cleanAddress}. Please check the address format.`)
      }
    }

    const geocodeData = await geocodeResponse.json()
    console.log('Geocoding response:', geocodeData)

    if (!geocodeData.latitude || !geocodeData.longitude) {
      throw new Error('Could not find coordinates for the provided address')
    }

    const { latitude, longitude } = geocodeData
    return await searchProperties(latitude, longitude, radius, bedrooms, bathrooms, rentcastApiKey)

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

async function searchProperties(latitude: number, longitude: number, radius: number, bedrooms: number, bathrooms: number, rentcastApiKey: string) {
  try {
    // Search for properties using Rentcast's property search API
    console.log('Searching for properties near coordinates:', { latitude, longitude, radius })
    
    const searchUrl = new URL('https://api.rentcast.io/v1/properties/search')
    searchUrl.searchParams.append('latitude', latitude.toString())
    searchUrl.searchParams.append('longitude', longitude.toString())
    searchUrl.searchParams.append('radius', (radius * 1609.34).toString()) // Convert miles to meters
    searchUrl.searchParams.append('limit', '20') // Get more results to filter from
    searchUrl.searchParams.append('propertyType', 'Manufactured')
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-API-Key': rentcastApiKey,
        'accept': 'application/json'
      }
    })

    console.log('Property search response status:', searchResponse.status)

    if (!searchResponse.ok) {
      throw new Error(`Property search failed with status: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()
    console.log('Property search response:', searchData)

    // Filter and format the results
    const comparables: ComparableHome[] = (searchData.properties || [])
      .filter((property: any) => {
        const propBeds = property.bedrooms || 0
        const propBaths = property.bathrooms || 0
        
        // Match bedrooms +/- 1 and bathrooms +/- 1
        return Math.abs(propBeds - bedrooms) <= 1 && 
               Math.abs(propBaths - bathrooms) <= 1 &&
               property.price > 0 // Only include properties with valid prices
      })
      .slice(0, 5) // Top 5 results
      .map((property: any) => ({
        address: property.formattedAddress || `${property.address}, ${property.city}, ${property.state}`,
        price: property.price || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFootage: property.squareFootage,
        listingDate: property.lastSaleDate || property.createdDate
      }))

    return new Response(
      JSON.stringify({ 
        success: true, 
        comparables,
        source: 'rentcast',
        searchLocation: { latitude, longitude }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in property search:', error)
    throw error
  }
}
