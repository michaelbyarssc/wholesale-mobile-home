import { useState } from 'react';
import { Edit, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category_id: string;
  display_order: number;
  featured: boolean;
  active: boolean;
  created_at: string;
  categories?: {
    id: string;
    name: string;
  };
}

interface FAQCategory {
  id: string;
  name: string;
}

interface FAQListProps {
  faqs: FAQ[];
  categories: FAQCategory[];
  onEdit: (faq: FAQ) => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export const FAQList = ({ faqs, categories, onEdit, onDelete, onRefresh }: FAQListProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (faqId: string) => {
    try {
      setDeletingId(faqId);
      const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', faqId);

      if (error) throw error;

      onDelete();
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      toast.error('Failed to delete FAQ');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (faq: FAQ) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ active: !faq.active })
        .eq('id', faq.id);

      if (error) throw error;

      onRefresh();
      toast.success(`FAQ ${faq.active ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error updating FAQ status:', error);
      toast.error('Failed to update FAQ status');
    }
  };

  const toggleFeatured = async (faq: FAQ) => {
    try {
      const { error } = await supabase
        .from('faqs')
        .update({ featured: !faq.featured })
        .eq('id', faq.id);

      if (error) throw error;

      onRefresh();
      toast.success(`FAQ ${faq.featured ? 'removed from' : 'added to'} featured list`);
    } catch (error) {
      console.error('Error updating FAQ featured status:', error);
      toast.error('Failed to update FAQ featured status');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  if (faqs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No FAQs found. Create your first FAQ to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <Card key={faq.id} className={`${!faq.active ? 'opacity-60' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">
                    {getCategoryName(faq.category_id)}
                  </Badge>
                  {faq.featured && (
                    <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {!faq.active && (
                    <Badge variant="destructive">
                      Inactive
                    </Badge>
                  )}
                  <Badge variant="outline">
                    Order: {faq.display_order}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-lg mb-2 break-words">
                  {faq.question}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-3 line-clamp-3 break-words">
                  {faq.answer}
                </p>
                
                <p className="text-xs text-muted-foreground">
                  Created: {new Date(faq.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(faq)}
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleActive(faq)}
                  title={faq.active ? 'Deactivate' : 'Activate'}
                >
                  {faq.active ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFeatured(faq)}
                  title={faq.featured ? 'Remove from featured' : 'Add to featured'}
                >
                  <Star className={`h-4 w-4 ${faq.featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletingId === faq.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete FAQ</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this FAQ? This action cannot be undone.
                        <br /><br />
                        <strong>Question:</strong> {faq.question}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(faq.id)}
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
      ))}
    </div>
  );
};