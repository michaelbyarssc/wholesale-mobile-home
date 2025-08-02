import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { optimizeDeliveryPhoto, type OptimizedImage } from "@/utils/imageOptimization";

interface DeliveryPhotoCaptureProps {
  deliveryId: string;
  driverId: string;
  currentPhase: string;
}

const REQUIRED_PHOTOS = {
  factory_pickup_in_progress: ['pickup_front', 'pickup_back', 'pickup_left', 'pickup_right'],
  factory_pickup_completed: ['pickup_front', 'pickup_back', 'pickup_left', 'pickup_right'],
  delivery_in_progress: ['delivery_front', 'delivery_back', 'delivery_left', 'delivery_right'],
  delivered: ['delivery_front', 'delivery_back', 'delivery_left', 'delivery_right', 'signature']
};

const PHOTO_LABELS = {
  pickup_front: 'Pickup - Front View',
  pickup_back: 'Pickup - Back View', 
  pickup_left: 'Pickup - Left Side',
  pickup_right: 'Pickup - Right Side',
  delivery_front: 'Delivery - Front View',
  delivery_back: 'Delivery - Back View',
  delivery_left: 'Delivery - Left Side', 
  delivery_right: 'Delivery - Right Side',
  signature: 'Customer Signature',
  damage: 'Damage Documentation',
  special_condition: 'Special Condition'
};

export const DeliveryPhotoCapture = ({ deliveryId, driverId, currentPhase }: DeliveryPhotoCaptureProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCamera, setIsCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const queryClient = useQueryClient();

  // Get existing photos
  const { data: existingPhotos } = useQuery({
    queryKey: ["delivery-photos", deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_photos")
        .select("*")
        .eq("delivery_id", deliveryId);
      
      if (error) throw error;
      return data;
    }
  });

  // Upload photo mutation with optimization
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ file, category, caption }: { file: File; category: string; caption: string }) => {
      setIsUploading(true);
      
      try {
        // Optimize image before upload
        const optimizedImage = await optimizeDeliveryPhoto(file);
        
        toast.success(`Image optimized: ${optimizedImage.compressionRatio}% reduction`);
        
        // Get current location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000
          });
        });

        // Convert optimized file to base64
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(optimizedImage.file);
        });

        // Upload via edge function
        const { data, error } = await supabase.functions.invoke('upload-delivery-photo', {
          body: {
            deliveryId,
            driverId,
            photoType: category,
            photoData: base64,
            caption,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            originalSize: optimizedImage.originalSize,
            optimizedSize: optimizedImage.optimizedSize,
            compressionRatio: optimizedImage.compressionRatio
          }
        });

        if (error) throw error;
        return data;
        
      } catch (error) {
        console.error('Photo optimization or upload failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-photos"] });
      toast.success("Photo uploaded successfully!");
      setCaption('');
      setSelectedCategory('');
      setIsUploading(false);
    },
    onError: (error) => {
      toast.error(`Failed to upload photo: ${error.message}`);
      setIsUploading(false);
    }
  });

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCamera(true);
    } catch (error) {
      toast.error("Failed to access camera");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCamera(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob && selectedCategory) {
          const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          uploadPhotoMutation.mutate({ file, category: selectedCategory, caption });
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  // Handle file upload with optimization
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedCategory) {
      // Show file size info
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.info(`Processing ${file.name} (${sizeInMB}MB)...`);
      
      uploadPhotoMutation.mutate({ file, category: selectedCategory, caption });
    }
  };

  // Get required photos for current phase
  const requiredPhotos = REQUIRED_PHOTOS[currentPhase as keyof typeof REQUIRED_PHOTOS] || [];
  const completedPhotos = existingPhotos?.filter(p => requiredPhotos.includes(p.photo_category)) || [];
  const missingPhotos = requiredPhotos.filter(category => 
    !completedPhotos.some(p => p.photo_category === category)
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Camera className="h-4 w-4 mr-2" />
            Photos ({completedPhotos.length}/{requiredPhotos.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery Photos</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Photo Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Required Photos for {currentPhase.replace(/_/g, ' ')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {requiredPhotos.map((category) => {
                    const isCompleted = completedPhotos.some(p => p.photo_category === category);
                    return (
                      <Badge 
                        key={category}
                        variant={isCompleted ? "default" : "outline"}
                        className="justify-center"
                      >
                        {isCompleted ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                        {PHOTO_LABELS[category as keyof typeof PHOTO_LABELS]}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Photo Capture */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Capture New Photo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Photo Category</Label>
                  <select 
                    className="w-full mt-1 p-2 border rounded"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">Select photo type...</option>
                    {missingPhotos.map(category => (
                      <option key={category} value={category}>
                        {PHOTO_LABELS[category as keyof typeof PHOTO_LABELS]}
                      </option>
                    ))}
                    <option value="damage">Damage Documentation</option>
                    <option value="special_condition">Special Condition</option>
                  </select>
                </div>

                <div>
                  <Label>Caption (Optional)</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add description..."
                  />
                </div>

                {/* Camera View */}
                {isCamera && (
                  <div className="space-y-4">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full max-w-md mx-auto rounded border"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={capturePhoto}
                        disabled={!selectedCategory || isUploading}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture
                      </Button>
                      <Button variant="outline" onClick={stopCamera}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Camera/Upload Buttons */}
                {!isCamera && (
                  <div className="flex gap-2">
                    <Button
                      onClick={startCamera}
                      disabled={!selectedCategory}
                      variant="outline"
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </Button>
                    
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!selectedCategory}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </CardContent>
            </Card>

            {/* Existing Photos */}
            {existingPhotos && existingPhotos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Uploaded Photos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {existingPhotos.map((photo) => (
                      <div key={photo.id} className="space-y-2">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Delivery photo'}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <div className="text-xs space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {PHOTO_LABELS[photo.photo_category as keyof typeof PHOTO_LABELS] || photo.photo_category}
                          </Badge>
                          {photo.caption && (
                            <p className="text-muted-foreground">{photo.caption}</p>
                          )}
                          <p className="text-muted-foreground">
                            {new Date(photo.taken_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
