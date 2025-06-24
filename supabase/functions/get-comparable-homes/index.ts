
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

    // Try multiple address formats for better geocoding success
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
      // If geocoding fails, try using a default location for the area and search broadly
      console.log('All geocoding attempts failed, trying area-based search')
      const areaCoords = await tryAreaSearch(address, rentcastApiKey)
      if (areaCoords) {
        latitude = areaCoords.latitude
        longitude = areaCoords.longitude
        console.log('Using area coordinates:', areaCoords)
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
  
  // Normalize common abbreviations and formatting
  let normalized = address.trim()
    .replace(/\brd\b/gi, 'Road')
    .replace(/\bst\b/gi, 'Street')
    .replace(/\bave\b/gi, 'Avenue')
    .replace(/\bdr\b/gi, 'Drive')
    .replace(/\bln\b/gi, 'Lane')
    .replace(/\bct\b/gi, 'Court')
    .replace(/\s+/g, ' ')
  
  if (normalized !== address.trim()) {
    variations.push(normalized)
  }
  
  // Remove house number and try just street + city
  const withoutNumber = address.replace(/^\d+\s+/, '').trim()
  if (withoutNumber !== address.trim()) {
    variations.push(withoutNumber)
  }
  
  // Extract city and state
  const cityState = extractCityState(address)
  if (cityState && cityState !== address.trim()) {
    variations.push(cityState)
  }
  
  // Try just the ZIP code if present
  const zipMatch = address.match(/\b\d{5}(?:-\d{4})?\b/)
  if (zipMatch) {
    variations.push(zipMatch[0])
  }
  
  // Try major city in the area (for Spartanburg area)
  if (address.toLowerCase().includes('spartanburg')) {
    variations.push('Spartanburg, SC')
    variations.push('29301') // Main Spartanburg ZIP
  }
  
  return [...new Set(variations)] // Remove duplicates
}

async function tryGeocode(address: string, apiKey: string): Promise<{latitude: number, longitude: number} | null> {
  try {
    const cleanAddress = address.trim()
      .replace(/\s+/g, ' ')
      .replace(/,?\s*SC\s*/i, ', SC ')
      .replace(/,?\s*South Carolina\s*/i, ', SC ')

    const geocodeUrl = `https://api.rentcast.io/v1/geocode?query=${encodeURIComponent(cleanAddress)}`
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'X-API-Key': apiKey,
        'accept': 'application/json'
      }
    })

    console.log(`Geocoding "${cleanAddress}" - Status: ${geocodeResponse.status}`)

    if (!geocodeResponse.ok) {
      return null
    }

    const geocodeData = await geocodeResponse.json()
    console.log('Geocoding response:', geocodeData)

    if (geocodeData.latitude && geocodeData.longitude) {
      return {
        latitude: geocodeData.latitude,
        longitude: geocodeData.longitude
      }
    }

    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

async function tryAreaSearch(address: string, apiKey: string): Promise<{latitude: number, longitude: number} | null> {
  // Known coordinates for major SC cities
  const knownAreas = {
    'spartanburg': { latitude: 34.9496, longitude: -81.9320 },
    'greenville': { latitude: 34.8526, longitude: -82.3940 },
    'columbia': { latitude: 34.0007, longitude: -81.0348 },
    'charleston': { latitude: 32.7765, longitude: -79.9311 },
  }
  
  const lowerAddress = address.toLowerCase()
  
  for (const [city, coords] of Object.entries(knownAreas)) {
    if (lowerAddress.includes(city)) {
      console.log(`Using known coordinates for ${city}:`, coords)
      return coords
    }
  }
  
  return null
}

function extractCityState(address: string): string {
  // Extract city and state from address
  const parts = address.split(',')
  if (parts.length >= 2) {
    // Take the last two parts (city, state)
    return parts.slice(-2).join(',').trim()
  }
  
  // If no comma, try to extract city and state pattern
  const match = address.match(/([A-Za-z\s]+),?\s+(SC|South Carolina)\s*\d*/i)
  if (match) {
    return `${match[1].trim()}, SC`
  }
  
  return address
}

async function searchProperties(latitude: number, longitude: number, radius: number, bedrooms: number, bathrooms: number, rentcastApiKey: string) {
  try {
    console.log('Searching for properties near coordinates:', { latitude, longitude, radius })
    
    const searchUrl = new URL('https://api.rentcast.io/v1/properties/search')
    searchUrl.searchParams.append('latitude', latitude.toString())
    searchUrl.searchParams.append('longitude', longitude.toString())
    searchUrl.searchParams.append('radius', (radius * 1609.34).toString()) // Convert miles to meters
    searchUrl.searchParams.append('limit', '20')
    searchUrl.searchParams.append('propertyType', 'Manufactured')
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'X-API-Key': rentcastApiKey,
        'accept': 'application/json'
      }
    })

    console.log('Property search response status:', searchResponse.status)

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('Property search failed:', errorText)
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
