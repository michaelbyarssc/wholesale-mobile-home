
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
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

interface EstimateTableRowProps {
  estimate: Estimate;
  onStatusUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onResend: (id: string) => void;
}

export const EstimateTableRow: React.FC<EstimateTableRowProps> = ({
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
      case 'converted':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">
        #{estimate.id.slice(-8)}
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div>{estimate.customer_phone}</div>
        </div>
      </TableCell>
      <TableCell>
        {estimate.mobile_homes ? 
          `${estimate.mobile_homes.manufacturer} ${estimate.mobile_homes.series} ${estimate.mobile_homes.model}` 
          : 'N/A'
        }
      </TableCell>
      <TableCell className="font-semibold">
        ${estimate.total_amount?.toLocaleString()}
      </TableCell>
      <TableCell>
        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(estimate.status)}`}>
          {estimate.status}
        </span>
      </TableCell>
      <TableCell>
        {format(new Date(estimate.created_at), 'MMM dd, yyyy')}
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onStatusUpdate(estimate.id, 'contacted')}
          >
            Mark Contacted
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onStatusUpdate(estimate.id, 'converted')}
          >
            Mark Converted
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onResend(estimate.id)}
          >
            <Mail className="h-3 w-3 mr-1" />
            Resend
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
                  Are you sure you want to delete this estimate? This action cannot be undone.
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
      </TableCell>
    </TableRow>
  );
};
