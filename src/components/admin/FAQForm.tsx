import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const faqSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters'),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  category_id: z.string().min(1, 'Category is required'),
  display_order: z.number().min(0, 'Display order must be 0 or greater'),
  featured: z.boolean(),
  active: z.boolean(),
});

type FAQFormData = z.infer<typeof faqSchema>;

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category_id: string;
  display_order: number;
  featured: boolean;
  active: boolean;
}

interface FAQCategory {
  id: string;
  name: string;
}

interface FAQFormProps {
  faq?: FAQ | null;
  categories: FAQCategory[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const FAQForm = ({ faq, categories, onSuccess, onCancel }: FAQFormProps) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<FAQFormData>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: faq?.question || '',
      answer: faq?.answer || '',
      category_id: faq?.category_id || '',
      display_order: faq?.display_order || 0,
      featured: faq?.featured || false,
      active: faq?.active !== false, // Default to true if not specified
    },
  });

  const onSubmit = async (data: FAQFormData) => {
    try {
      setLoading(true);

      if (faq) {
        // Update existing FAQ
        const { error } = await supabase
          .from('faqs')
          .update(data)
          .eq('id', faq.id);

        if (error) throw error;
      } else {
        // Create new FAQ
        const { error } = await supabase
          .from('faqs')
          .insert([{
            question: data.question,
            answer: data.answer,
            category_id: data.category_id,
            display_order: data.display_order,
            featured: data.featured,
            active: data.active
          }]);

        if (error) throw error;
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving FAQ:', error);
      toast.error('Failed to save FAQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{faq ? 'Edit FAQ' : 'Create New FAQ'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the FAQ question..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="answer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Answer</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the FAQ answer..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select a category...</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
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

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Featured (show on homepage)
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Active
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : faq ? 'Update FAQ' : 'Create FAQ'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};