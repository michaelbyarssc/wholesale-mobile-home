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
  distance?: number;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address, bedrooms, bathrooms, radius }: ComparableHomeRequest = await req.json()

    console.log('Searching for comparable homes:', { address, bedrooms, bathrooms, radius })

    const rentcastApiKey = Deno.env.get('RENTCAST_API_KEY')
    
    if (!rentcastApiKey) {
      throw new Error('Rentcast API key not configured')
    }

    console.log('API Key configured:', !!rentcastApiKey)
    console.log('API Key length:', rentcastApiKey.length)

    // Try different address formats for geocoding
    const addressVariations = generateAddressVariations(address)
    console.log('Trying address variations:', addressVariations)

    let latitude: number | null = null
    let longitude: number | null = null

    // Try each address variation until one works
    for (const addressVariation of addressVariations) {
      console.log('Trying geocoding for:', addressVariation)
      
      const coords = await tryGeocode(addressVariation, rentcastApiKey)
      if (coords) {
        latitude = coords.latitude
        longitude = coords.longitude
        console.log('Successfully geocoded:', addressVariation, coords)
        break
      }
    }

    if (!latitude || !longitude) {
      // If geocoding fails, try using default coordinates for the area
      console.log('All geocoding attempts failed, using area fallback')
      const areaCoords = getAreaFallbackCoords(address)
      if (areaCoords) {
        latitude = areaCoords.latitude
        longitude = areaCoords.longitude
        console.log('Using area fallback coordinates:', areaCoords)
      } else {
        throw new Error('Unable to find location coordinates. Please try entering just the city and state (e.g., "Spartanburg, SC") or a nearby ZIP code.')
      }
    }

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

function generateAddressVariations(address: string): string[] {
  const variations: string[] = []
  
  // Original address
  variations.push(address.trim())
  
  // Try just city and state if we can extract them
  const cityState = extractCityState(address)
  if (cityState && cityState !== address.trim()) {
    variations.push(cityState)
  }
  
  // Try just the ZIP code if present
  const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/)
  if (zipMatch) {
    variations.push(zipMatch[0])
  }
  
  return [...new Set(variations)] // Remove duplicates
}

function extractCityState(address: string): string {
  // Extract city and state from address
  const parts = address.split(',').map(p => p.trim())
  
  // Look for state abbreviation or full name
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
    // Check if this part looks like a state (2 letters or known state name)
    if (part.match(/^[A-Z]{2}$/) || ['South Carolina', 'North Carolina', 'Georgia', 'Florida', 'Tennessee', 'Alabama'].includes(part)) {
      // Found state, get city (previous part)
      if (i > 0) {
        return `${parts[i-1]}, ${part.replace('South Carolina', 'SC').replace('North Carolina', 'NC')}`
      }
    }
  }
  
  return address
}

function getAreaFallbackCoords(address: string): {latitude: number, longitude: number} | null {
  // Known coordinates for major SC cities and surrounding areas
  const knownAreas = {
    'spartanburg': { latitude: 34.9496, longitude: -81.9320 },
    'greenville': { latitude: 34.8526, longitude: -82.3940 },
    'columbia': { latitude: 34.0007, longitude: -81.0348 },
    'charleston': { latitude: 32.7765, longitude: -79.9311 },
    'rock hill': { latitude: 34.9249, longitude: -81.0251 },
    'mount pleasant': { latitude: 32.8323, longitude: -79.8284 },
  }
  
  const lowerAddress = address.toLowerCase()
  
  for (const [city, coords] of Object.entries(knownAreas)) {
    if (lowerAddress.includes(city)) {
      console.log(`Using known coordinates for ${city}:`, coords)
      return coords
    }
  }
  
  // Default to Spartanburg area if we can't determine location
  if (lowerAddress.includes('sc') || lowerAddress.includes('south carolina')) {
    return knownAreas.spartanburg
  }
  
  return null
}

async function tryGeocode(address: string, apiKey: string): Promise<{latitude: number, longitude: number} | null> {
  try {
    // Try the current Rentcast geocoding endpoint
    const geocodeUrl = `https://api.rentcast.io/v1/geocode?query=${encodeURIComponent(address)}`
    
    console.log('Making geocode request to:', geocodeUrl)
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    console.log(`Geocoding "${address}" - Status: ${geocodeResponse.status}`)

    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text()
      console.log('Geocoding error response:', errorText)
      return null
    }

    const geocodeData = await geocodeResponse.json()
    console.log('Geocoding response data:', JSON.stringify(geocodeData, null, 2))

    // Handle the response format from Rentcast
    if (geocodeData && geocodeData.latitude && geocodeData.longitude) {
      return {
        latitude: geocodeData.latitude,
        longitude: geocodeData.longitude
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding request error:', error)
    return null
  }
}

async function searchProperties(latitude: number, longitude: number, radius: number, bedrooms: number, bathrooms: number, rentcastApiKey: string) {
  try {
    console.log('Searching for properties near coordinates:', { latitude, longitude, radius })
    
    // Use a larger search radius for the API call (1.5x the requested radius to ensure coverage)
    const searchRadiusMeters = Math.round(radius * 1.5 * 1609.34)
    
    // Use the current Rentcast property search endpoint
    const searchUrl = new URL('https://api.rentcast.io/v1/listings/sale')
    searchUrl.searchParams.append('latitude', latitude.toString())
    searchUrl.searchParams.append('longitude', longitude.toString())
    searchUrl.searchParams.append('radius', searchRadiusMeters.toString())
    searchUrl.searchParams.append('limit', '50') // Get more results to filter
    searchUrl.searchParams.append('bedrooms', bedrooms.toString())
    searchUrl.searchParams.append('bathrooms', bathrooms.toString())
    searchUrl.searchParams.append('propertyType', 'Single Family')
    
    console.log('Making property search request to:', searchUrl.toString())

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-API-Key': rentcastApiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    console.log('Property search response status:', searchResponse.status)

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('Property search error response:', errorText)
      
      // Return empty results instead of throwing error
      return new Response(
        JSON.stringify({ 
          success: true, 
          comparables: [],
          source: 'rentcast',
          message: 'No comparable properties found in this area. This could be due to limited data availability.',
          searchLocation: { latitude, longitude },
          totalFound: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const searchData = await searchResponse.json()
    console.log('Property search response:', JSON.stringify(searchData, null, 2))

    return formatSearchResults(searchData, bedrooms, bathrooms, latitude, longitude, radius)

  } catch (error) {
    console.error('Error in property search:', error)
    
    // Return empty results instead of throwing error
    return new Response(
      JSON.stringify({ 
        success: true, 
        comparables: [],
        source: 'rentcast',
        message: 'Unable to search for comparable properties at this time. Please try again later.',
        searchLocation: { latitude, longitude },
        totalFound: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
}

function formatSearchResults(searchData: any, targetBedrooms: number, targetBathrooms: number, searchLat: number, searchLon: number, maxRadius: number) {
  // Handle different response formats
  const properties = searchData.listings || searchData.properties || searchData.results || searchData || []
  
  console.log('Raw properties data:', properties)
  
  // Filter and format the results with distance checking
  const comparables: ComparableHome[] = properties
    .map((property: any) => {
      // Calculate distance from search center
      const propLat = property.latitude
      const propLon = property.longitude
      
      if (!propLat || !propLon) {
        return null; // Skip properties without coordinates
      }
      
      const distance = calculateDistance(searchLat, searchLon, propLat, propLon)
      
      return {
        address: property.formattedAddress || property.address || `${property.streetAddress || ''}, ${property.city || ''}, ${property.state || ''}`.replace(/^,\s*|,\s*$/g, ''),
        price: property.price || property.salePrice || property.value || property.listPrice || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFootage: property.squareFootage || property.livingArea || property.squareFeet,
        listingDate: property.lastSaleDate || property.createdDate || property.listDate || property.saleDate,
        distance: Math.round(distance * 10) / 10 // Round to 1 decimal place
      }
    })
    .filter((property: any) => {
      if (!property) return false;
      
      const propBeds = property.bedrooms || 0
      const propBaths = property.bathrooms || 0
      
      // Check distance constraint
      if (property.distance > maxRadius) {
        console.log(`Filtering out property at ${property.address} - distance: ${property.distance} miles > ${maxRadius} miles`)
        return false;
      }
      
      // Match bedrooms +/- 1 and bathrooms +/- 1
      const bedroomMatch = Math.abs(propBeds - targetBedrooms) <= 1
      const bathroomMatch = Math.abs(propBaths - targetBathrooms) <= 1
      const hasPrice = property.price > 0
      
      return bedroomMatch && bathroomMatch && hasPrice
    })
    .sort((a: ComparableHome, b: ComparableHome) => (a.distance || 0) - (b.distance || 0)) // Sort by distance
    .slice(0, 10) // Top 10 closest results

  console.log('Formatted comparables:', comparables)
  console.log(`Found ${comparables.length} properties within ${maxRadius} miles`)

  return new Response(
    JSON.stringify({ 
      success: true, 
      comparables,
      source: 'rentcast',
      searchLocation: { latitude: searchLat, longitude: searchLon },
      totalFound: properties.length || 0,
      radiusUsed: maxRadius
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}
