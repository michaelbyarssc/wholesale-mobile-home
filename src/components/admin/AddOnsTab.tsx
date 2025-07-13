import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServicesTab } from './ServicesTab';
import { HomeOptionsTab } from './HomeOptionsTab';

export const AddOnsTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Add-ons Management</h2>
          <p className="text-muted-foreground">
            Manage services and home options for customer estimates
          </p>
        </div>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="options">Home Options</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <ServicesTab />
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <HomeOptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};