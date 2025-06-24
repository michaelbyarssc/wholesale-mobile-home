
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit } from 'lucide-react';

interface MarkupEditorProps {
  userId: string;
  currentMarkup: number;
  onMarkupUpdated: () => void;
}

export const MarkupEditor = ({ userId, currentMarkup, onMarkupUpdated }: MarkupEditorProps) => {
  const [editingMarkup, setEditingMarkup] = useState<string | null>(null);
  const [markupValue, setMarkupValue] = useState<number>(0);
  const { toast } = useToast();

  const updateMarkupPercentage = async (userId: string, percentage: number) => {
    try {
      const { data: updateData, error: updateError } = await supabase
        .from('customer_markups')
        .update({ markup_percentage: percentage, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select();

      if (updateData && updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('customer_markups')
          .insert({ user_id: userId, markup_percentage: percentage });

        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      toast({
        title: "Markup updated",
        description: `Markup percentage set to ${percentage}%`,
      });

      onMarkupUpdated();
      setEditingMarkup(null);
    } catch (error: any) {
      console.error('Error updating markup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update markup percentage",
        variant: "destructive",
      });
    }
  };

  const startEditingMarkup = (userId: string, currentMarkup: number) => {
    setEditingMarkup(userId);
    setMarkupValue(currentMarkup || 30);
  };

  const cancelMarkupEdit = () => {
    setEditingMarkup(null);
    setMarkupValue(0);
  };

  if (editingMarkup === userId) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={markupValue}
          onChange={(e) => setMarkupValue(parseFloat(e.target.value) || 0)}
          className="w-20"
        />
        <Button
          size="sm"
          onClick={() => updateMarkupPercentage(userId, markupValue)}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={cancelMarkupEdit}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{currentMarkup || 0}%</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => startEditingMarkup(userId, currentMarkup || 0)}
      >
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
};
