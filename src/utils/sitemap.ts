// Sitemap generator for better SEO indexing
export const generateSitemap = async (): Promise<string> => {
  const baseUrl = 'https://wholesalemobilehome.com';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Static pages
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/faq', priority: '0.8', changefreq: 'weekly' },
    { url: '/auth', priority: '0.7', changefreq: 'monthly' },
    { url: '/estimate-form', priority: '0.9', changefreq: 'weekly' },
    { url: '/appointments', priority: '0.7', changefreq: 'weekly' },
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Add static pages
  staticPages.forEach(page => {
    sitemap += `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  // Note: In a real implementation, you would fetch mobile home data here
  // and add dynamic pages for each mobile home
  // For now, we'll just include the static pages

  sitemap += `
</urlset>`;

  return sitemap;
};

// Generate robots.txt content
export const generateRobotsTxt = (): string => {
  const baseUrl = 'https://wholesalemobilehome.com';
  
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1`;
};