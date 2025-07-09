import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";
import { Search, Calendar, User, Eye } from "lucide-react";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

type BlogPost = Tables<"blog_posts">;
type BlogCategory = Tables<"blog_categories">;

export default function Blog() {
  const { slug } = useParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [featuredPosts, setFeaturedPosts] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogData = async () => {
      try {
        // Fetch categories
        const { data: categoriesData } = await supabase
          .from("blog_categories")
          .select("*")
          .eq("active", true)
          .order("display_order");

        if (categoriesData) setCategories(categoriesData);

        // Fetch featured posts
        const { data: featuredData } = await supabase
          .from("blog_posts")
          .select(`
            *,
            blog_categories (name, slug)
          `)
          .eq("published", true)
          .eq("featured", true)
          .order("created_at", { ascending: false })
          .limit(3);

        if (featuredData) setFeaturedPosts(featuredData);

        // Fetch all posts based on category or search
        let query = supabase
          .from("blog_posts")
          .select(`
            *,
            blog_categories (name, slug)
          `)
          .eq("published", true);

        if (selectedCategory) {
          query = query.eq("category_id", selectedCategory);
        }

        if (searchTerm) {
          query = query.or(`title.ilike.%${searchTerm}%,excerpt.ilike.%${searchTerm}%`);
        }

        const { data: postsData } = await query
          .order("created_at", { ascending: false })
          .limit(12);

        if (postsData) setPosts(postsData);
      } catch (error) {
        console.error("Error fetching blog data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogData();
  }, [selectedCategory, searchTerm]);

  const incrementViewCount = async (postId: string) => {
    await supabase.rpc("increment_post_views", { post_id: postId });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Resources & Guides
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Expert advice, buying guides, and maintenance tips for mobile home owners
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search articles..."
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
              All Posts
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

        {/* Featured Posts */}
        {!selectedCategory && !searchTerm && featuredPosts.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-6">Featured Articles</h2>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {featuredPosts.map((post) => (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {post.featured_image_url && (
                    <div className="aspect-video relative overflow-hidden">
                      <img
                        src={post.featured_image_url}
                        alt={post.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <Badge className="absolute top-4 left-4 bg-primary">
                        Featured
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(post.created_at), "MMM dd, yyyy")}
                      <Eye className="w-4 h-4 ml-2" />
                      {post.view_count}
                    </div>
                    <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => incrementViewCount(post.id)}
                    >
                      Read More
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="mb-8" />
          </>
        )}

        {/* All Posts */}
        <h2 className="text-2xl font-bold mb-6">
          {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : "Latest Articles"}
        </h2>
        
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No articles found.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {post.featured_image_url && (
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={post.featured_image_url}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(post.created_at), "MMM dd, yyyy")}
                    <Eye className="w-4 h-4 ml-2" />
                    {post.view_count}
                  </div>
                  <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 mb-4">
                    {post.excerpt}
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => incrementViewCount(post.id)}
                  >
                    Read More
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}