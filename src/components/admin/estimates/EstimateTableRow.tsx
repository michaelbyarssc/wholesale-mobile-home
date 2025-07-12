
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Trash2, Mail, RefreshCw, FileText } from 'lucide-react';
import { EstimateDocuSignButton } from '@/components/estimate-approval/EstimateDocuSignButton';
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
  approved_at?: string;
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
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'converted':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs p-2">
        #{estimate.id.slice(-6)}
      </TableCell>
      <TableCell className="text-xs p-2">
        {estimate.customer_phone}
      </TableCell>
      <TableCell className="text-xs p-2 max-w-32 truncate">
        {estimate.mobile_homes ? 
          `${estimate.mobile_homes.manufacturer} ${estimate.mobile_homes.model}` 
          : 'N/A'
        }
      </TableCell>
      <TableCell className="font-semibold text-xs p-2">
        ${estimate.total_amount?.toLocaleString()}
      </TableCell>
      <TableCell className="p-2">
        <span className={`px-1.5 py-0.5 rounded text-xs ${getStatusBadgeClass(estimate.status)}`}>
          {estimate.status}
        </span>
      </TableCell>
      <TableCell className="text-xs p-2">
        {format(new Date(estimate.created_at), 'MM/dd')}
      </TableCell>
      <TableCell className="p-2">
        <div className="flex gap-1">
          {estimate.status !== 'approved' && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs px-2 py-1 h-6"
                onClick={() => onStatusUpdate(estimate.id, 'contacted')}
              >
                Contact
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-xs px-2 py-1 h-6"
                onClick={() => onStatusUpdate(estimate.id, 'converted')}
              >
                Convert
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            variant="outline"
            className="text-xs px-2 py-1 h-6"
            onClick={() => onResend(estimate.id)}
          >
            <Mail className="h-3 w-3" />
          </Button>
          <EstimateDocuSignButton
            estimateId={estimate.id}
            customerEmail={estimate.customer_email}
            customerName={estimate.customer_name}
            estimateNumber={estimate.id.slice(-8)}
            documentType="estimate"
            hasInvoice={false}
          />
          <Button 
            size="sm" 
            variant="outline"
            className="text-xs px-2 py-1 h-6"
            onClick={() => onResend(estimate.id)}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                size="sm" 
                variant="destructive"
                className="text-xs px-2 py-1 h-6"
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
