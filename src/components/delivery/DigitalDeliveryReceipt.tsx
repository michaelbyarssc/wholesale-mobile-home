import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Camera, Signature, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SignaturePad from 'signature_pad';

interface DigitalDeliveryReceiptProps {
  deliveryId: string;
  customerName: string;
  deliveryNumber: string;
}

interface DeliveryItem {
  name: string;
  quantity: number;
  condition: 'excellent' | 'good' | 'fair' | 'damaged';
  notes?: string;
}

export const DigitalDeliveryReceipt: React.FC<DigitalDeliveryReceiptProps> = ({
  deliveryId,
  customerName,
  deliveryNumber
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const customerSignaturePadRef = useRef<SignaturePad | null>(null);
  const driverSignaturePadRef = useRef<SignaturePad | null>(null);
  const customerCanvasRef = useRef<HTMLCanvasElement>(null);
  const driverCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [items, setItems] = useState<DeliveryItem[]>([
    { name: 'Mobile Home', quantity: 1, condition: 'excellent' }
  ]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  React.useEffect(() => {
    if (customerCanvasRef.current && !customerSignaturePadRef.current) {
      customerSignaturePadRef.current = new SignaturePad(customerCanvasRef.current);
    }
    if (driverCanvasRef.current && !driverSignaturePadRef.current) {
      driverSignaturePadRef.current = new SignaturePad(driverCanvasRef.current);
    }
  }, []);

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, condition: 'excellent' }]);
  };

  const updateItem = (index: number, field: keyof DeliveryItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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

  const generateReceiptMutation = useMutation({
    mutationFn: async () => {
      const customerSignatureData = customerSignaturePadRef.current?.toDataURL();
      const driverSignatureData = driverSignaturePadRef.current?.toDataURL();

      if (!customerSignatureData || customerSignaturePadRef.current?.isEmpty()) {
        throw new Error('Customer signature is required');
      }

      if (!driverSignatureData || driverSignaturePadRef.current?.isEmpty()) {
        throw new Error('Driver signature is required');
      }

      // Generate unique receipt number
      const receiptNumber = `RCP-${deliveryNumber}-${Date.now()}`;

      // Upload signatures to storage
      const customerSignatureBlob = await fetch(customerSignatureData).then(r => r.blob());
      const driverSignatureBlob = await fetch(driverSignatureData).then(r => r.blob());

      const { data: customerUpload, error: customerError } = await supabase.storage
        .from('delivery-signatures')
        .upload(`${deliveryId}/customer-signature-${Date.now()}.png`, customerSignatureBlob);

      if (customerError) throw customerError;

      const { data: driverUpload, error: driverError } = await supabase.storage
        .from('delivery-signatures')
        .upload(`${deliveryId}/driver-signature-${Date.now()}.png`, driverSignatureBlob);

      if (driverError) throw driverError;

      // Get public URLs
      const { data: customerUrl } = supabase.storage
        .from('delivery-signatures')
        .getPublicUrl(customerUpload.path);

      const { data: driverUrl } = supabase.storage
        .from('delivery-signatures')
        .getPublicUrl(driverUpload.path);

      // Upload photos if any
      const uploadedPhotos = [];
      for (let i = 0; i < photos.length; i++) {
        const photoBlob = await fetch(photos[i]).then(r => r.blob());
        const { data: photoUpload, error: photoError } = await supabase.storage
          .from('delivery-photos')
          .upload(`${deliveryId}/receipt-photo-${Date.now()}-${i}.jpg`, photoBlob);

        if (photoError) throw photoError;

        const { data: photoUrl } = supabase.storage
          .from('delivery-photos')
          .getPublicUrl(photoUpload.path);

        uploadedPhotos.push(photoUrl.publicUrl);
      }

      // Create receipt record
      const { data, error } = await supabase
        .from('delivery_receipts')
        .insert({
          delivery_id: deliveryId,
          receipt_number: receiptNumber,
          customer_signature_url: customerUrl.publicUrl,
          driver_signature_url: driverUrl.publicUrl,
          items_delivered: items as any,
          delivery_photos: uploadedPhotos as any,
          notes,
          signed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update delivery status to completed
      await supabase
        .from('deliveries')
        .update({ status: 'completed' })
        .eq('id', deliveryId);

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Receipt Generated",
        description: "Digital delivery receipt has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      
      // Clear signatures
      customerSignaturePadRef.current?.clear();
      driverSignaturePadRef.current?.clear();
      setPhotos([]);
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: "Receipt Generation Failed",
        description: error.message || "Failed to generate receipt",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReceipt = async () => {
    setIsGenerating(true);
    try {
      await generateReceiptMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Digital Delivery Receipt
        </CardTitle>
        <CardDescription>
          Complete delivery and generate digital receipt
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Delivery Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Items Delivered</h4>
            <Button size="sm" onClick={addItem} variant="outline">
              Add Item
            </Button>
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label>Item Name</Label>
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(index, 'name', e.target.value)}
                  placeholder="Item name"
                />
              </div>
              <div className="col-span-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                  min="1"
                />
              </div>
              <div className="col-span-3">
                <Label>Condition</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={item.condition}
                  onChange={(e) => updateItem(index, 'condition', e.target.value)}
                >
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Input
                  value={item.notes || ''}
                  onChange={(e) => updateItem(index, 'notes', e.target.value)}
                  placeholder="Notes"
                />
              </div>
              <div className="col-span-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Photo Capture */}
        <div className="space-y-3">
          <Label>Delivery Photos</Label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
              id="photo-capture"
            />
            <Label htmlFor="photo-capture" className="cursor-pointer">
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
                  alt={`Delivery photo ${index + 1}`}
                  className="w-full h-20 object-cover rounded border"
                />
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Delivery Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about the delivery..."
            rows={3}
          />
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Customer Signature</Label>
            <div className="border rounded-lg p-2">
              <canvas
                ref={customerCanvasRef}
                width={300}
                height={150}
                className="w-full border rounded"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => customerSignaturePadRef.current?.clear()}
            >
              Clear
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Driver Signature</Label>
            <div className="border rounded-lg p-2">
              <canvas
                ref={driverCanvasRef}
                width={300}
                height={150}
                className="w-full border rounded"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => driverSignaturePadRef.current?.clear()}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Generate Receipt */}
        <Button
          onClick={handleGenerateReceipt}
          disabled={isGenerating || generateReceiptMutation.isPending}
          className="w-full"
        >
          {isGenerating || generateReceiptMutation.isPending ? (
            'Generating Receipt...'
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Generate Receipt & Complete Delivery
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};