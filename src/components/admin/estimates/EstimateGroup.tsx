
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, User, Mail } from 'lucide-react';
import { EstimateTableRow } from './EstimateTableRow';
import { EstimateCard } from './EstimateCard';

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
  onSendApproval: (id: string) => void;
}

export const EstimateGroup: React.FC<EstimateGroupProps> = ({
  group,
  onStatusUpdate,
  onDelete,
  onResend,
  onSendApproval,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer p-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium text-sm">{group.customer_name}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Mail className="h-3 w-3" />
              <span>{group.customer_email}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {group.estimates.length} estimate{group.estimates.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs p-2">ID</TableHead>
                  <TableHead className="text-xs p-2">Phone</TableHead>
                  <TableHead className="text-xs p-2">Model</TableHead>
                  <TableHead className="text-xs p-2">Amount</TableHead>
                  <TableHead className="text-xs p-2">Status</TableHead>
                  <TableHead className="text-xs p-2">Date</TableHead>
                  <TableHead className="text-xs p-2">Actions</TableHead>
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
                    onSendApproval={onSendApproval}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-2 p-3">
            {group.estimates.map((estimate) => (
              <EstimateCard
                key={estimate.id}
                estimate={estimate}
                onStatusUpdate={onStatusUpdate}
                onDelete={onDelete}
                onResend={onResend}
                onSendApproval={onSendApproval}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};
