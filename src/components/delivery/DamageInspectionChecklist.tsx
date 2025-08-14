import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Camera, AlertTriangle, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DamageInspectionChecklistProps {
  deliveryId: string;
  inspectionType: 'pre_delivery' | 'post_delivery';
}

interface InspectionItem {
  category: string;
  item: string;
  checked: boolean;
  condition: 'excellent' | 'good' | 'fair' | 'damaged';
  notes?: string;
}

const defaultInspectionItems: InspectionItem[] = [
  { category: 'Exterior', item: 'Siding condition', checked: false, condition: 'excellent' },
  { category: 'Exterior', item: 'Windows and screens', checked: false, condition: 'excellent' },
  { category: 'Exterior', item: 'Doors and frames', checked: false, condition: 'excellent' },
  { category: 'Exterior', item: 'Roof condition', checked: false, condition: 'excellent' },
  { category: 'Exterior', item: 'Gutters and downspouts', checked: false, condition: 'excellent' },
  { category: 'Interior', item: 'Flooring', checked: false, condition: 'excellent' },
  { category: 'Interior', item: 'Walls and ceilings', checked: false, condition: 'excellent' },
  { category: 'Interior', item: 'Kitchen appliances', checked: false, condition: 'excellent' },
  { category: 'Interior', item: 'Bathroom fixtures', checked: false, condition: 'excellent' },
  { category: 'Interior', item: 'Electrical outlets', checked: false, condition: 'excellent' },
  { category: 'Interior', item: 'Plumbing fixtures', checked: false, condition: 'excellent' },
  { category: 'Structural', item: 'Foundation/blocks', checked: false, condition: 'excellent' },
  { category: 'Structural', item: 'Frame integrity', checked: false, condition: 'excellent' },
  { category: 'Structural', item: 'Leveling', checked: false, condition: 'excellent' },
];

export const DamageInspectionChecklist: React.FC<DamageInspectionChecklistProps> = ({
  deliveryId,
  inspectionType
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>(defaultInspectionItems);
  const [damageDescription, setDamageDescription] = useState('');
  const [repairCostEstimate, setRepairCostEstimate] = useState<number | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateInspectionItem = (index: number, field: keyof InspectionItem, value: any) => {
    const updatedItems = [...inspectionItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setInspectionItems(updatedItems);
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setPhotos(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const hasAnyDamage = inspectionItems.some(item => item.condition === 'damaged');
  const completionPercentage = Math.round((inspectionItems.filter(item => item.checked).length / inspectionItems.length) * 100);

  const submitInspectionMutation = useMutation({
    mutationFn: async () => {
      // Upload photos if any
      const uploadedPhotos = [];
      for (let i = 0; i < photos.length; i++) {
        const photoBlob = await fetch(photos[i]).then(r => r.blob());
        const { data: photoUpload, error: photoError } = await supabase.storage
          .from('delivery-photos')
          .upload(`${deliveryId}/inspection-${inspectionType}-${Date.now()}-${i}.jpg`, photoBlob);

        if (photoError) throw photoError;

        const { data: photoUrl } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(photoUpload.path);

        uploadedPhotos.push(photoUrl.publicUrl);
      }

      // Create inspection record
      const { data, error } = await supabase
        .from('damage_inspections')
        .insert({
          delivery_id: deliveryId,
          inspection_type: inspectionType,
          inspector_id: (await supabase.auth.getUser()).data.user?.id,
          inspection_items: inspectionItems as any,
          damage_found: hasAnyDamage,
          damage_description: hasAnyDamage ? damageDescription : null,
          damage_photos: uploadedPhotos,
          severity_level: hasAnyDamage ? 
            (inspectionItems.filter(item => item.condition === 'damaged').length > 3 ? 'high' : 
             inspectionItems.filter(item => item.condition === 'damaged').length > 1 ? 'medium' : 'low') : null,
          repair_required: hasAnyDamage && repairCostEstimate !== null && repairCostEstimate > 0,
          repair_cost_estimate: repairCostEstimate,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Inspection Completed",
        description: "Damage inspection has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      
      // Reset form
      setInspectionItems(defaultInspectionItems);
      setDamageDescription('');
      setRepairCostEstimate(null);
      setPhotos([]);
    },
    onError: (error: any) => {
      toast({
        title: "Inspection Submission Failed",
        description: error.message || "Failed to submit inspection",
        variant: "destructive",
      });
    },
  });

  const handleSubmitInspection = async () => {
    if (completionPercentage < 100) {
      toast({
        title: "Incomplete Inspection",
        description: "Please complete all inspection items before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (hasAnyDamage && !damageDescription.trim()) {
      toast({
        title: "Missing Damage Description",
        description: "Please provide a description of the damage found.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await submitInspectionMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const groupedItems = inspectionItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InspectionItem[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5" />
          {inspectionType === 'pre_delivery' ? 'Pre-Delivery' : 'Post-Delivery'} Inspection
        </CardTitle>
        <CardDescription>
          Complete inspection checklist to document mobile home condition
        </CardDescription>
        <div className="flex items-center gap-2">
          <Badge variant={completionPercentage === 100 ? 'default' : 'secondary'}>
            {completionPercentage}% Complete
          </Badge>
          {hasAnyDamage && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Damage Found
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inspection Items by Category */}
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h4 className="font-medium text-lg">{category}</h4>
            <div className="space-y-2">
              {items.map((item, index) => {
                const globalIndex = inspectionItems.findIndex(i => i === item);
                return (
                  <div key={globalIndex} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                    <div className="col-span-1">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(checked) => 
                          updateInspectionItem(globalIndex, 'checked', checked)
                        }
                      />
                    </div>
                    <div className="col-span-4">
                      <span className="text-sm">{item.item}</span>
                    </div>
                    <div className="col-span-3">
                      <select
                        className="w-full p-1 text-sm border rounded"
                        value={item.condition}
                        onChange={(e) => updateInspectionItem(globalIndex, 'condition', e.target.value)}
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="damaged">Damaged</option>
                      </select>
                    </div>
                    <div className="col-span-4">
                      <Input
                        placeholder="Notes"
                        value={item.notes || ''}
                        onChange={(e) => updateInspectionItem(globalIndex, 'notes', e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Damage Description */}
        {hasAnyDamage && (
          <div className="space-y-3">
            <Label>Damage Description</Label>
            <Textarea
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              placeholder="Describe the damage found in detail..."
              rows={4}
              className="border-red-200"
            />
          </div>
        )}

        {/* Repair Cost Estimate */}
        {hasAnyDamage && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Estimated Repair Cost
            </Label>
            <Input
              type="number"
              value={repairCostEstimate || ''}
              onChange={(e) => setRepairCostEstimate(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        )}

        {/* Photo Capture */}
        <div className="space-y-3">
          <Label>Inspection Photos</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="inspection-photos"
            />
            <Label htmlFor="inspection-photos" className="cursor-pointer">
              <Button type="button" variant="outline" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Capture Photos
              </Button>
            </Label>
          </div>
          
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Inspection photo ${index + 1}`}
                  className="w-full h-20 object-cover rounded border"
                />
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitInspection}
          disabled={isSubmitting || submitInspectionMutation.isPending || completionPercentage < 100}
          className="w-full"
          variant={hasAnyDamage ? 'destructive' : 'default'}
        >
          {isSubmitting || submitInspectionMutation.isPending ? (
            'Submitting Inspection...'
          ) : (
            `Submit ${inspectionType === 'pre_delivery' ? 'Pre-Delivery' : 'Post-Delivery'} Inspection`
          )}
        </Button>
      </CardContent>
    </Card>
  );
};