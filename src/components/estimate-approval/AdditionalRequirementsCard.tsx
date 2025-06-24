
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AdditionalRequirementsCardProps {
  additionalRequirements: string;
}

export const AdditionalRequirementsCard = ({ additionalRequirements }: AdditionalRequirementsCardProps) => {
  if (!additionalRequirements) return null;

  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader className="bg-purple-50 border-b">
        <CardTitle className="text-purple-900">Additional Requirements</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="text-gray-700 whitespace-pre-wrap">{additionalRequirements}</p>
      </CardContent>
    </Card>
  );
};
