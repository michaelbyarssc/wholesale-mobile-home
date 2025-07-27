import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  display_order: z.number().min(0, 'Display order must be 0 or greater'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface FAQCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  active: boolean;
}

interface FAQCategoryManagerProps {
  categories: FAQCategory[];
  onUpdate: () => void;
}

export const FAQCategoryManager = ({ categories, onUpdate }: FAQCategoryManagerProps) => {
  const [editingCategory, setEditingCategory] = useState<FAQCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      display_order: 0,
    },
  });

  const resetForm = () => {
    form.reset({
      name: '',
      description: '',
      display_order: 0,
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleEdit = (category: FAQCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || '',
      display_order: category.display_order,
    });
    setShowForm(true);
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true);

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('faq_categories')
          .update(data)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        // Create new category - generate slug from name
        const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const { error } = await supabase
          .from('faq_categories')
          .insert([{ 
            name: data.name,
            description: data.description || '',
            display_order: data.display_order,
            slug, 
            active: true 
          }]);

        if (error) throw error;
        toast.success('Category created successfully');
      }

      resetForm();
      onUpdate();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      // Check if category has FAQs
      const { data: faqCount } = await supabase
        .from('faqs')
        .select('id', { count: 'exact' })
        .eq('category_id', categoryId);

      if (faqCount && faqCount.length > 0) {
        toast.error('Cannot delete category with existing FAQs. Please move or delete the FAQs first.');
        return;
      }

      const { error } = await supabase
        .from('faq_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast.success('Category deleted successfully');
      onUpdate();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Category Management</h3>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Category name..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Category description..."
                          rows={2}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No categories found. Create your first category to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{category.name}</h4>
                      <Badge variant="outline">Order: {category.display_order}</Badge>
                      {category.active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the category "{category.name}"? 
                            This action cannot be undone and will fail if there are FAQs in this category.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(category.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};