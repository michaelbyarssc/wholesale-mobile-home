import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Search, 
  Image as ImageIcon, 
  Download, 
  MapPin,
  Calendar,
  User,
  Eye,
  ExternalLink
} from "lucide-react";

interface TransactionPhotoViewerProps {
  onClose?: () => void;
}

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
  special_condition: 'Special Condition',
  issue: 'Issue Photo'
};

export const TransactionPhotoViewer = ({ onClose }: TransactionPhotoViewerProps) => {
  const [transactionNumber, setTransactionNumber] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);

  // Get photos for transaction
  const { data: photoData, isLoading, error } = useQuery({
    queryKey: ["transaction-photos", transactionNumber],
    queryFn: async () => {
      if (!transactionNumber.trim()) return null;
      
      const { data, error } = await supabase.functions.invoke('get-transaction-photos', {
        body: { transactionNumber: transactionNumber.trim() }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!transactionNumber.trim() && searchAttempted,
    retry: false
  });

  const handleSearch = () => {
    if (!transactionNumber.trim()) {
      toast.error("Please enter a transaction number");
      return;
    }
    setSearchAttempted(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const downloadPhoto = async (photoUrl: string, photoId: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-${photoId}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Photo downloaded successfully");
    } catch (error) {
      toast.error("Failed to download photo");
    }
  };

  const openPhoto = (photoUrl: string) => {
    window.open(photoUrl, '_blank');
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Transaction Photo Viewer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="transaction-search">Transaction Number</Label>
            <Input
              id="transaction-search"
              placeholder="Enter transaction number (e.g., WMH-123456)"
              value={transactionNumber}
              onChange={(e) => setTransactionNumber(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>
          <Button 
            onClick={handleSearch}
            disabled={!transactionNumber.trim() || isLoading}
            className="mt-6"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && searchAttempted && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="text-red-800">
                <p className="font-medium">Transaction not found</p>
                <p className="text-sm">
                  Please check the transaction number and try again. Make sure you have access to view this transaction's photos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {photoData && !isLoading && (
          <div className="space-y-6">
            {/* Transaction Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Customer</p>
                      <p className="text-sm text-muted-foreground">{photoData.delivery.customerName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Transaction</p>
                      <p className="text-sm text-muted-foreground">{photoData.delivery.transactionNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    <div>
                      <p className="text-sm font-medium">Total Photos</p>
                      <p className="text-sm text-muted-foreground">{photoData.photoCounts.total}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-primary">{photoData.photoCounts.pickup}</p>
                  <p className="text-sm text-muted-foreground">Pickup Photos</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-primary">{photoData.photoCounts.delivery}</p>
                  <p className="text-sm text-muted-foreground">Delivery Photos</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-primary">{photoData.photoCounts.signature}</p>
                  <p className="text-sm text-muted-foreground">Signatures</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-primary">{photoData.photoCounts.issues}</p>
                  <p className="text-sm text-muted-foreground">Issue Photos</p>
                </CardContent>
              </Card>
            </div>

            {/* Photo Grid */}
            {photoData.photos.length > 0 ? (
              <div className="space-y-6">
                {Object.entries(photoData.photosByCategory).map(([category, photos]: [string, any[]]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {PHOTO_LABELS[category as keyof typeof PHOTO_LABELS] || category}
                      </h3>
                      <Badge variant="outline">{photos.length}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((photo: any) => (
                        <Card key={photo.id} className="overflow-hidden">
                          <div className="relative group">
                            <img
                              src={photo.photo_url}
                              alt={photo.caption || 'Delivery photo'}
                              className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => openPhoto(photo.photo_url)}
                            />
                            
                            {/* Photo Actions Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => openPhoto(photo.photo_url)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => downloadPhoto(photo.photo_url, photo.id)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Photo Info */}
                          <CardContent className="p-3">
                            {photo.caption && (
                              <p className="text-sm text-muted-foreground mb-2">{photo.caption}</p>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{new Date(photo.taken_at).toLocaleDateString()}</span>
                              {photo.latitude && photo.longitude && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  <span>GPS</span>
                                </div>
                              )}
                            </div>
                            
                            {photo.drivers && (
                              <p className="text-xs text-muted-foreground mt-1">
                                By: {photo.drivers.full_name}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No photos found for this transaction</p>
                  <p className="text-sm text-muted-foreground">
                    Photos will appear here once the driver starts taking them during delivery.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Help Text */}
        {!searchAttempted && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-blue-800 text-sm">
                <strong>How to use:</strong> Enter a transaction number (e.g., WMH-123456) to view all photos associated with that delivery. 
                You can view photos if you are the customer, driver, admin, or super admin for this transaction.
              </p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

// Dialog wrapper for easy integration
export const TransactionPhotoDialog = ({ children }: { children: React.ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Photos</DialogTitle>
        </DialogHeader>
        <TransactionPhotoViewer />
      </DialogContent>
    </Dialog>
  );
};