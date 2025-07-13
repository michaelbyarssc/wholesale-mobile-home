import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EstimatesTab } from './EstimatesTab';
import { InvoiceManagement } from './InvoiceManagement';
import { Receipt, FileText } from 'lucide-react';

export const SalesTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Management</h2>
          <p className="text-muted-foreground">
            Manage customer estimates and invoices
          </p>
        </div>
      </div>

      <Tabs defaultValue="estimates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="estimates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Estimates
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="estimates" className="space-y-4">
          <EstimatesTab />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoiceManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};