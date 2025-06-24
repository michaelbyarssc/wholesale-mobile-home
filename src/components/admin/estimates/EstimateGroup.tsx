
import React from 'react';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EstimateCard } from './EstimateCard';
import { EstimateTableRow } from './EstimateTableRow';

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

interface GroupedEstimate {
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  estimates: Estimate[];
}

interface EstimateGroupProps {
  group: GroupedEstimate;
  onStatusUpdate: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onResend: (id: string) => void;
}

export const EstimateGroup: React.FC<EstimateGroupProps> = ({
  group,
  onStatusUpdate,
  onDelete,
  onResend,
}) => {
  return (
    <Collapsible key={group.user_id || 'anonymous'} defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 md:p-4 bg-gray-50 hover:bg-gray-100 rounded-lg">
        <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
          <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform ui-state-closed:rotate-[-90deg]" />
          <div className="text-left min-w-0 flex-1">
            <h3 className="font-semibold text-sm md:text-lg truncate">{group.customer_name}</h3>
            <p className="text-xs md:text-sm text-gray-600 truncate">{group.customer_email}</p>
            <p className="text-xs md:text-sm text-blue-600">
              {group.estimates.length} estimate{group.estimates.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-xs md:text-sm font-medium">
            ${group.estimates.reduce((sum, est) => sum + est.total_amount, 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            {format(new Date(Math.max(...group.estimates.map(e => new Date(e.created_at).getTime()))), 'MMM dd, yyyy')}
          </p>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="mt-2">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {group.estimates.map((estimate) => (
              <EstimateCard
                key={estimate.id}
                estimate={estimate}
                onStatusUpdate={onStatusUpdate}
                onDelete={onDelete}
                onResend={onResend}
              />
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate ID</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Mobile Home</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.estimates.map((estimate) => (
                  <EstimateTableRow
                    key={estimate.id}
                    estimate={estimate}
                    onStatusUpdate={onStatusUpdate}
                    onDelete={onDelete}
                    onResend={onResend}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
