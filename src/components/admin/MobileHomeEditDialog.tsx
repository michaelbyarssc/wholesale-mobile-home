
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MobileHomeBasicForm } from './mobile-home-edit/MobileHomeBasicForm';
import { MobileHomeImageManager } from './mobile-home-edit/MobileHomeImageManager';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface MobileHomeEditDialogProps {
  mobileHome: MobileHome | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const MobileHomeEditDialog = ({ mobileHome, open, onClose, onSave }: MobileHomeEditDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<MobileHome>>({});
  const [features, setFeatures] = useState<string>('');

  useEffect(() => {
    if (mobileHome) {
      setFormData(mobileHome);
      if (mobileHome.features) {
        if (Array.isArray(mobileHome.features)) {
          setFeatures(mobileHome.features.join('\n'));
        } else if (typeof mobileHome.features === 'string') {
          setFeatures(mobileHome.features);
        } else {
          setFeatures('');
        }
      } else {
        setFeatures('');
      }
    }
  }, [mobileHome]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!mobileHome) return;

    try {
      const featuresArray = features.split('\n').filter(f => f.trim()).map(f => f.trim());
      
      const { error } = await supabase
        .from('mobile_homes')
        .update({
          ...formData,
          features: featuresArray.length > 0 ? featuresArray : null
        })
        .eq('id', mobileHome.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mobile home updated successfully.",
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating mobile home:', error);
      toast({
        title: "Error",
        description: "Failed to update mobile home.",
        variant: "destructive",
      });
    }
  };

  if (!mobileHome) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Mobile Home: {mobileHome.manufacturer} {mobileHome.model}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Basic Info */}
          <div>
            <MobileHomeBasicForm
              formData={formData}
              features={features}
              onInputChange={handleInputChange}
              onFeaturesChange={setFeatures}
            />
          </div>

          {/* Right Column - Images */}
          <div>
            <MobileHomeImageManager mobileHome={mobileHome} />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
