
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface MobileHomeBasicFormProps {
  formData: Partial<MobileHome>;
  features: string;
  onInputChange: (field: string, value: any) => void;
  onFeaturesChange: (value: string) => void;
}

export const MobileHomeBasicForm = ({ 
  formData, 
  features, 
  onInputChange, 
  onFeaturesChange 
}: MobileHomeBasicFormProps) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="manufacturer">Manufacturer</Label>
        <Input
          id="manufacturer"
          name="manufacturer"
          value={formData.manufacturer || ''}
          onChange={(e) => onInputChange('manufacturer', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="series">Series</Label>
        <Select value={formData.series || ''} onValueChange={(value) => onInputChange('series', value)}>
          <SelectTrigger id="series" name="series" aria-label="Select series">
            <SelectValue placeholder="Select series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Tru">Tru</SelectItem>
            <SelectItem value="Epic">Epic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="model">Model</Label>
        <Input
          id="model"
          name="model"
          value={formData.model || ''}
          onChange={(e) => onInputChange('model', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="display_name">Display Name</Label>
        <Input
          id="display_name"
          name="display_name"
          value={formData.display_name || ''}
          onChange={(e) => onInputChange('display_name', e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="price">Cost (Internal Price)</Label>
        <div className="space-y-2">
          {formData.price && (
            <div className="text-sm text-gray-600 font-medium">
              Current Cost: {formatPrice(formData.price)}
            </div>
          )}
          <Input
            id="price"
            name="price"
            type="number"
            value={formData.price || ''}
            onChange={(e) => onInputChange('price', parseFloat(e.target.value))}
            placeholder="Enter internal cost without $ or commas"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="retail_price">Retail Price (Public Display)</Label>
        <div className="space-y-2">
          {formData.retail_price && (
            <div className="text-sm text-gray-600 font-medium">
              Current Retail Price: {formatPrice(formData.retail_price)}
            </div>
          )}
          <Input
            id="retail_price"
            name="retail_price"
            type="number"
            value={formData.retail_price || ''}
            onChange={(e) => onInputChange('retail_price', parseFloat(e.target.value))}
            placeholder="Enter retail price for public display"
          />
          <p className="text-xs text-gray-500">
            This price will be shown to visitors who are not logged in
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="minimum_profit">Minimum Profit per Home</Label>
        <div className="space-y-2">
          {formData.minimum_profit !== undefined && (
            <div className="text-sm text-gray-600 font-medium">
              Current Minimum Profit: {formatPrice(formData.minimum_profit)}
            </div>
          )}
          <Input
            id="minimum_profit"
            name="minimum_profit"
            type="number"
            value={formData.minimum_profit || ''}
            onChange={(e) => onInputChange('minimum_profit', parseFloat(e.target.value))}
            placeholder="Enter minimum profit amount"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="square_footage">Square Footage</Label>
        <Input
          id="square_footage"
          name="square_footage"
          type="number"
          value={formData.square_footage || ''}
          onChange={(e) => onInputChange('square_footage', parseInt(e.target.value))}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input
            id="bedrooms"
            name="bedrooms"
            type="number"
            value={formData.bedrooms || ''}
            onChange={(e) => onInputChange('bedrooms', parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input
            id="bathrooms"
            name="bathrooms"
            type="number"
            step="0.5"
            value={formData.bathrooms || ''}
            onChange={(e) => onInputChange('bathrooms', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="length_feet">Length (ft)</Label>
          <Input
            id="length_feet"
            name="length_feet"
            type="number"
            value={formData.length_feet || ''}
            onChange={(e) => onInputChange('length_feet', parseInt(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="width_feet">Width (ft)</Label>
          <Input
            id="width_feet"
            name="width_feet"
            type="number"
            value={formData.width_feet || ''}
            onChange={(e) => onInputChange('width_feet', parseInt(e.target.value))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description || ''}
          onChange={(e) => onInputChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea
          id="features"
          name="features"
          value={features}
          onChange={(e) => onFeaturesChange(e.target.value)}
          rows={5}
          placeholder="Enter each feature on a new line"
        />
      </div>
    </div>
  );
};
