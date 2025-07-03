
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MobileHomeBasicForm } from './mobile-home-edit/MobileHomeBasicForm';
import { MobileHomeImageManager } from './mobile-home-edit/MobileHomeImageManager';
import { FactoryAssignment } from './mobile-home-edit/FactoryAssignment';
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
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<MobileHome>>({});
  const [features, setFeatures] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

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

    setIsSaving(true);
    
    try {
      // Check if mobile home has factory assignments
      const { data: assignments, error: assignmentError } = await supabase
        .from('mobile_home_factories')
        .select('id')
        .eq('mobile_home_id', mobileHome.id)
        .limit(1);

      if (assignmentError) {
        throw new Error(`Failed to check factory assignments: ${assignmentError.message}`);
      }

      if (!assignments || assignments.length === 0) {
        toast({
          title: "Factory Assignment Required",
          description: "You must assign at least one factory before saving this mobile home.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

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

      // Invalidate all mobile home related queries to ensure data sync
      queryClient.invalidateQueries({ queryKey: ['admin-mobile-homes'] });
      queryClient.invalidateQueries({ queryKey: ['public-mobile-homes'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-home-images'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-home-series'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-homes-for-conditions'] });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating mobile home:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update mobile home.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!mobileHome) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Mobile Home: {mobileHome.manufacturer} {mobileHome.model}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-1">
            <MobileHomeBasicForm
              formData={formData}
              features={features}
              onInputChange={handleInputChange}
              onFeaturesChange={setFeatures}
            />
          </div>

          {/* Middle Column - Factory Assignment */}
          <div className="lg:col-span-1">
            <FactoryAssignment mobileHomeId={mobileHome.id} />
          </div>

          {/* Right Column - Images */}
          <div className="lg:col-span-1">
            <MobileHomeImageManager mobileHome={mobileHome} />
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
