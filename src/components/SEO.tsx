import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  structuredData?: object;
  noIndex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title = "Wholesale Mobile Homes for Sale | Quality Homes at Best Prices",
  description = "Browse quality mobile homes at wholesale prices. Get instant quotes, view detailed specs, and save thousands. Clayton, Champion, and Fleetwood homes available with financing options.",
  keywords = "mobile homes for sale, wholesale mobile homes, manufactured homes, modular homes, clayton homes, champion homes, fleetwood homes, mobile home financing, affordable housing",
  image = "https://wholesalemobilehome.com/images/mobile-home-exterior-1.jpg",
  url = "https://wholesalemobilehome.com",
  type = "website",
  structuredData,
  noIndex = false
}) => {
  const fullTitle = title.includes('WholesaleMobileHome.com') ? title : `${title} | WholesaleMobileHome.com`;
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://wholesalemobilehome.com');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots Meta */}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="WholesaleMobileHome.com" />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@WholesaleMobileHome" />
      
      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};