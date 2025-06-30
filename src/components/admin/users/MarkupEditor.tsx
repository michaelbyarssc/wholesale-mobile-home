
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit } from 'lucide-react';

interface MarkupEditorProps {
  userId: string;
  currentMarkup: number;
  currentMinProfit: number;
  onMarkupUpdated: () => void;
}

export const MarkupEditor = ({ userId, currentMarkup, currentMinProfit, onMarkupUpdated }: MarkupEditorProps) => {
  const [editingMarkup, setEditingMarkup] = useState<string | null>(null);
  const [markupValue, setMarkupValue] = useState<number>(0);
  const [minProfitValue, setMinProfitValue] = useState<number>(0);
  const { toast } = useToast();

  const updateMarkupAndProfit = async (userId: string, percentage: number, minProfit: number) => {
    try {
      const { data: updateData, error: updateError } = await supabase
        .from('customer_markups')
        .update({ 
          markup_percentage: percentage,
          minimum_profit_per_home: minProfit,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .select();

      if (updateData && updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('customer_markups')
          .insert({ 
            user_id: userId, 
            markup_percentage: percentage,
            minimum_profit_per_home: minProfit
          });

        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      toast({
        title: "Pricing updated",
        description: `Markup set to ${percentage}% and minimum profit to $${minProfit}`,
      });

      onMarkupUpdated();
      setEditingMarkup(null);
    } catch (error: any) {
      console.error('Error updating pricing:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing",
        variant: "destructive",
      });
    }
  };

  const startEditingMarkup = (userId: string, currentMarkup: number, currentMinProfit: number) => {
    setEditingMarkup(userId);
    setMarkupValue(currentMarkup || 30);
    setMinProfitValue(currentMinProfit || 0);
  };

  const cancelMarkupEdit = () => {
    setEditingMarkup(null);
    setMarkupValue(0);
    setMinProfitValue(0);
  };

  if (editingMarkup === userId) {
    return (
      <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="markup" className="text-xs font-medium">Markup %</Label>
            <Input
              id="markup"
              type="number"
              step="0.01"
              min="0"
              value={markupValue}
              onChange={(e) => setMarkupValue(parseFloat(e.target.value) || 0)}
              className="h-8"
              placeholder="30"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="minProfit" className="text-xs font-medium">Min Profit $</Label>
            <Input
              id="minProfit"
              type="number"
              step="0.01"
              min="0"
              value={minProfitValue}
              onChange={(e) => setMinProfitValue(parseFloat(e.target.value) || 0)}
              className="h-8"
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => updateMarkupAndProfit(userId, markupValue, minProfitValue)}
            className="h-7 px-3 text-xs"
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={cancelMarkupEdit}
            className="h-7 px-3 text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm">
        <div className="font-medium">{currentMarkup || 0}% markup</div>
        <div className="text-xs text-gray-500">${currentMinProfit || 0} minimum</div>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => startEditingMarkup(userId, currentMarkup || 0, currentMinProfit || 0)}
        className="h-7 w-7 p-0"
      >
        <Edit className="h-3 w-3" />
      </Button>
    </div>
  );
};
