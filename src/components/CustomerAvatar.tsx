import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomerAvatarProps {
  customerName: string;
  avatarUrl?: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
  onAvatarUpdate?: (url: string) => void;
}

export function CustomerAvatar({ 
  customerName, 
  avatarUrl, 
  color, 
  size = 'md',
  editable = false,
  onAvatarUpdate 
}: CustomerAvatarProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('customer-avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('customer-avatars')
        .getPublicUrl(filePath);

      if (onAvatarUpdate) {
        onAvatarUpdate(data.publicUrl);
      }

      toast({
        title: "Avatar uploaded successfully",
        description: "Customer avatar has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error uploading avatar",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <Avatar className={sizeClasses[size]} style={{ borderColor: color, borderWidth: '2px' }}>
        <AvatarImage src={avatarUrl} alt={customerName} />
        <AvatarFallback style={{ backgroundColor: color + '20', color: color }}>
          {getInitials(customerName)}
        </AvatarFallback>
      </Avatar>
      
      {editable && (
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
          <label htmlFor="avatar-upload" className="cursor-pointer">
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
              className="hidden"
            />
            <Upload className="h-4 w-4 text-white" />
          </label>
        </div>
      )}
    </div>
  );
}