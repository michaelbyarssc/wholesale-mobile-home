import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";
import { Search, HelpCircle, Star } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useMultiUserAuth } from "@/hooks/useMultiUserAuth";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { SEO } from "@/components/SEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type FAQ = Tables<"faqs"> & {
  faq_categories: Pick<Tables<"faq_categories">, "name" | "slug"> | null;
};
type FAQCategory = Tables<"faq_categories">;

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [featuredFaqs, setFeaturedFaqs] = useState<FAQ[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const { user, userProfile, signOut, isLoading: authLoading } = useMultiUserAuth();

  const handleLogout = async () => {
    await signOut();
  };
  const { cartItems, toggleCart } = useShoppingCart();

  useEffect(() => {
    const fetchFAQData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("faq_categories")
          .select("*")
          .eq("active", true)
          .order("display_order");

        if (categoriesData) setCategories(categoriesData);

        // Fetch featured FAQs
        const { data: featuredData } = await supabase
          .from("faqs")
          .select(`
            *,
            faq_categories (name, slug)
          `)
          .eq("active", true)
          .eq("featured", true)
          .order("display_order")
          .limit(6);

        if (featuredData) setFeaturedFaqs(featuredData);

        // Fetch all FAQs based on category or search
        let query = supabase
          .from("faqs")
          .select(`
            *,
            faq_categories (name, slug)
          `)
          .eq("active", true);

        if (selectedCategory) {
          query = query.eq("category_id", selectedCategory);
        }

        if (searchTerm) {
          query = query.or(`question.ilike.%${searchTerm}%,answer.ilike.%${searchTerm}%`);
        }

        const { data: faqsData } = await query.order("display_order");

        if (faqsData) setFaqs(faqsData);
      } catch (error) {
        console.error("Error fetching FAQ data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQData();
  }, [selectedCategory, searchTerm]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const filteredFaqs = selectedCategory || searchTerm ? faqs : [];

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": featuredFaqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="Frequently Asked Questions - Mobile Home Sales & Service"
        description="Get answers to common questions about mobile home purchases, financing, delivery, installation, and more. Expert guidance for your mobile home buying journey."
        keywords="mobile home FAQ, mobile home questions, mobile home financing, mobile home delivery, mobile home installation, manufactured home questions"
        structuredData={faqStructuredData}
      />
      <Header
        user={user}
        userProfile={userProfile}
        cartItems={cartItems}
        isLoading={authLoading}
        onLogout={handleLogout}
        onToggleCart={toggleCart}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs className="mb-6" />
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured FAQs */}
        {!selectedCategory && !searchTerm && featuredFaqs.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <Star className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Most Asked Questions</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              {featuredFaqs.map((faq) => (
                <Card key={faq.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">{faq.question}</CardTitle>
                      <Badge variant="secondary" className="shrink-0">
                        <Star className="w-3 h-3 mr-1" />
                        Popular
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                    {faq.faq_categories && (
                      <Badge variant="outline" className="mt-3">
                        {faq.faq_categories.name}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* All FAQs or Filtered Results */}
        {(selectedCategory || searchTerm) && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">
                {selectedCategory 
                  ? `${categories.find(c => c.id === selectedCategory)?.name} Questions`
                  : `Search Results for "${searchTerm}"`
                }
              </h2>
            </div>
            
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <HelpCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-lg">No FAQs found matching your criteria.</p>
                <p className="text-muted-foreground">Try adjusting your search or browse all categories.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFaqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id} className="border border-border rounded-lg px-6">
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <div className="flex items-start justify-between gap-4 w-full">
                        <span className="font-medium">{faq.question}</span>
                        {faq.featured && (
                          <Badge variant="secondary" className="shrink-0">
                            <Star className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3">
                        <p className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                        {faq.faq_categories && (
                          <Badge variant="outline">
                            {faq.faq_categories.name}
                          </Badge>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </>
        )}

        {/* Browse by Category */}
        {!selectedCategory && !searchTerm && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold">Browse by Category</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card 
                  key={category.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      Browse Questions
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Contact Section */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Still Have Questions?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Can't find what you're looking for? Our team is here to help with any questions about our mobile homes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button>Get an Estimate</Button>
                <Button variant="outline" onClick={() => navigate('/appointments')}>Contact Us</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}