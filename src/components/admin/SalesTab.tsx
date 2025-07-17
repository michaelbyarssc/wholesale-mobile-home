import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EstimatesTab } from './EstimatesTab';
import { InvoiceManagement } from './InvoiceManagement';
import { Receipt, FileText, Truck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export const SalesTab = () => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Sales Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage customer estimates and invoices
          </p>
        </div>
      </div>

      <Tabs defaultValue="estimates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-10 sm:h-11">
          <TabsTrigger value="estimates" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            {isMobile ? 'Estimates' : 'Estimates'}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
            <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
            {isMobile ? 'Invoices' : 'Invoices'}
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2">
            <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
            {isMobile ? 'Deliveries' : 'Deliveries'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estimates" className="space-y-4 mt-4">
          <EstimatesTab />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          <InvoiceManagement />
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4 mt-4">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Manage delivery schedules and track delivery status.
            </p>
            <div className="border rounded-md p-6 flex items-center justify-center">
              <p className="text-muted-foreground">Delivery management will be implemented in the next phase.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};