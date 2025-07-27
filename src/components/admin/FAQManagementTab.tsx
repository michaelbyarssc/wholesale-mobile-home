import { useState, useEffect } from 'react';
import { Plus, Search, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FAQForm } from './FAQForm';
import { FAQList } from './FAQList';
import { FAQCategoryManager } from './FAQCategoryManager';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category_id: string;
  display_order: number;
  featured: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name: string;
  };
}

interface FAQCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  active: boolean;
}

export const FAQManagementTab = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<FAQCategory[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterFaqs();
  }, [searchQuery, selectedCategory, faqs]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('faq_categories')
        .select('*')
        .order('display_order');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch FAQs with categories
      const { data: faqsData, error: faqsError } = await supabase
        .from('faqs')
        .select(`
          *,
          categories:faq_categories(id, name)
        `)
        .order('display_order');

      if (faqsError) throw faqsError;
      setFaqs(faqsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load FAQ data');
    } finally {
      setLoading(false);
    }
  };

  const filterFaqs = () => {
    let filtered = faqs;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category_id === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFaqs(filtered);
  };

  const handleFaqCreated = () => {
    setShowForm(false);
    setEditingFaq(null);
    fetchData();
    toast.success('FAQ saved successfully');
  };

  const handleFaqDeleted = () => {
    fetchData();
    toast.success('FAQ deleted successfully');
  };

  const handleEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingFaq(null);
  };

  const totalFaqs = faqs.length;
  const activeFaqs = faqs.filter(faq => faq.active).length;
  const featuredFaqs = faqs.filter(faq => faq.featured).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {editingFaq ? 'Edit FAQ' : 'Add New FAQ'}
          </h2>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
        <FAQForm
          faq={editingFaq}
          categories={categories}
          onSuccess={handleFaqCreated}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">FAQ Management</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total FAQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFaqs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active FAQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeFaqs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Featured FAQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{featuredFaqs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="faqs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="categories">
            <Folder className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <FAQList
            faqs={filteredFaqs}
            categories={categories}
            onEdit={handleEdit}
            onDelete={handleFaqDeleted}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="categories">
          <FAQCategoryManager
            categories={categories}
            onUpdate={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};