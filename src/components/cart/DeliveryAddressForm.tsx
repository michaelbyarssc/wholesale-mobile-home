import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Check, X } from 'lucide-react';
import { DeliveryAddress } from '@/hooks/useShoppingCart';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

interface DeliveryAddressFormProps {
  address: DeliveryAddress | null;
  onAddressChange: (address: DeliveryAddress | null) => void;
  isRequired?: boolean;
}

export const DeliveryAddressForm = ({
  address,
  onAddressChange,
  isRequired = true
}: DeliveryAddressFormProps) => {
  const [isEditing, setIsEditing] = useState(!address);
  const [formData, setFormData] = useState<DeliveryAddress>({
    street: address?.street || '',
    city: address?.city || '',
    state: address?.state || '',
    zipCode: address?.zipCode || ''
  });
  const [errors, setErrors] = useState<Partial<DeliveryAddress>>({});
  const [debugInfo, setDebugInfo] = useState<string>('');
  const streetInputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, initializeAutocomplete, clearAutocomplete } = useGooglePlaces();

  // Initialize Google Places autocomplete when editing starts and API is loaded
  useEffect(() => {
    if (isEditing && isLoaded && streetInputRef.current) {
      const autocomplete = initializeAutocomplete(
        streetInputRef.current,
        (place) => {
          setDebugInfo(`Received: Street="${place.street}" City="${place.city}" State="${place.state}" ZIP="${place.zipCode}"`);
          
          setFormData({
            street: place.street,
            city: place.city,
            state: place.state,
            zipCode: place.zipCode
          });
          
          // Clear any existing errors when autocomplete fills the form
          setErrors({});
        }
      );

      return () => {
        clearAutocomplete();
      };
    }
  }, [isEditing, isLoaded, initializeAutocomplete, clearAutocomplete]);

  const validateForm = () => {
    const newErrors: Partial<DeliveryAddress> = {};
    
    if (!formData.street.trim()) {
      newErrors.street = 'Street address is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    } else if (formData.state.length !== 2) {
      newErrors.state = 'State must be 2 characters (e.g., SC)';
    }
    
    if (!formData.zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
      newErrors.zipCode = 'ZIP code must be 5 digits or 5+4 format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onAddressChange(formData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    if (address) {
      setFormData(address);
      setIsEditing(false);
    } else {
      setFormData({ street: '', city: '', state: '', zipCode: '' });
    }
    setErrors({});
  };

  const handleClear = () => {
    setFormData({ street: '', city: '', state: '', zipCode: '' });
    onAddressChange(null);
    setIsEditing(true);
    setErrors({});
  };

  const handleInputChange = (field: keyof DeliveryAddress, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isSCAddress = formData.state.toLowerCase() === 'sc';
  const isFormValid = formData.street && formData.city && formData.state && formData.zipCode;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-blue-600" />
          Delivery Address
          {isRequired && <span className="text-red-500">*</span>}
          {isSCAddress && (
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded font-normal">
              SC Sales Tax Applied
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {!isEditing && address ? (
          <div className="space-y-2">
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium">{address.street}</p>
              <p>{address.city}, {address.state.toUpperCase()} {address.zipCode}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
              >
                Edit Address
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClear}
              >
                Clear Address
              </Button>
            </div>
          </div>
        ) : (
            <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                ref={streetInputRef}
                id="street"
                placeholder="Start typing your address..."
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                className={errors.street ? 'border-red-500' : ''}
              />
              {errors.street && (
                <p className="text-sm text-red-500">{errors.street}</p>
              )}
              {isLoaded && (
                <p className="text-xs text-gray-500">
                  ✨ Start typing to see address suggestions
                </p>
              )}
              {debugInfo && (
                <div className="text-xs bg-blue-50 border border-blue-200 p-2 rounded">
                  <strong>Debug:</strong> {debugInfo}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Charleston"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={errors.city ? 'border-red-500' : ''}
                />
                {errors.city && (
                  <p className="text-sm text-red-500">{errors.city}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="SC"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                  maxLength={2}
                  className={errors.state ? 'border-red-500' : ''}
                />
                {errors.state && (
                  <p className="text-sm text-red-500">{errors.state}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                placeholder="29401"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                className={errors.zipCode ? 'border-red-500' : ''}
              />
              {errors.zipCode && (
                <p className="text-sm text-red-500">{errors.zipCode}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSave}
                disabled={!isFormValid}
                size="sm"
              >
                <Check className="h-4 w-4 mr-2" />
                Save Address
              </Button>
              
              {address && (
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};