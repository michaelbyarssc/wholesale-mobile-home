
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2, Mail } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Estimate {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
  user_id: string | null;
  mobile_homes: {
    manufacturer: string;
    series: string;
    model: string;
  };
}

interface EstimateCardProps {
  estimate: Estimate;
  onStatusUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onResend: (id: string) => void;
}

export const EstimateCard: React.FC<EstimateCardProps> = ({
  estimate,
  onStatusUpdate,
  onDelete,
  onResend,
}) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="font-mono text-xs">
            #{estimate.id.slice(-8)}
          </div>
          <div className="text-right">
            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(estimate.status)}`}>
              {estimate.status}
            </span>
            {estimate.approved_at && (
              <div className="text-xs text-green-600 mt-1">
                Approved: {format(new Date(estimate.approved_at), 'MMM dd')}
              </div>
            )}
          </div>
        </div>
        
        <div className="text-sm">
          <div className="font-medium">{estimate.customer_phone}</div>
          <div className="text-gray-600">
            {estimate.mobile_homes ? 
              `${estimate.mobile_homes.manufacturer} ${estimate.mobile_homes.series} ${estimate.mobile_homes.model}` 
              : 'N/A'
            }
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="font-semibold text-lg">
            ${estimate.total_amount?.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            {format(new Date(estimate.created_at), 'MMM dd, yyyy')}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 pt-2">
          {estimate.status !== 'approved' && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => onStatusUpdate(estimate.id, 'contacted')}
              >
                Mark Contacted
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="flex-1"
                onClick={() => onStatusUpdate(estimate.id, 'converted')}
              >
                Mark Converted
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1"
              onClick={() => onResend(estimate.id)}
            >
              <Mail className="h-3 w-3 mr-1" />
              {estimate.approved_at ? 'Resend Email' : 'Send Approval Link'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this estimate for {estimate.customer_name}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(estimate.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
};
