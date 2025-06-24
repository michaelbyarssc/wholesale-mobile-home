
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface PDFUploadComponentProps {
  onDataExtracted: (data: any[]) => void;
}

export const PDFUploadComponent: React.FC<PDFUploadComponentProps> = ({ onDataExtracted }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        toast({
          title: "File Selected",
          description: `Selected: ${file.name}`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const processPDF = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    try {
      // For now, we'll create a mock data extraction
      // In a real implementation, you would use a PDF parsing library
      const mockEpicSeriesData = [
        {
          manufacturer: 'Clayton',
          series: 'Epic',
          model: 'Epic 1',
          display_name: 'Epic Home 1',
          square_footage: 1200,
          bedrooms: 3,
          bathrooms: 2,
          length_feet: 60,
          width_feet: 20,
          features: ['Central Air', 'Kitchen Island', 'Walk-in Closet'],
          description: 'Spacious Epic series home with modern amenities',
          price: 85000
        },
        {
          manufacturer: 'Clayton',
          series: 'Epic',
          model: 'Epic 2',
          display_name: 'Epic Home 2',
          square_footage: 1400,
          bedrooms: 3,
          bathrooms: 2,
          length_feet: 70,
          width_feet: 20,
          features: ['Vaulted Ceilings', 'Master Suite', 'Kitchen Island'],
          description: 'Premium Epic series home with luxury features',
          price: 95000
        }
      ];

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      onDataExtracted(mockEpicSeriesData);
      
      toast({
        title: "Success",
        description: `Extracted data for ${mockEpicSeriesData.length} Epic series homes from PDF.`,
      });

      setSelectedFile(null);
      // Reset the input
      const input = document.getElementById('pdf-upload') as HTMLInputElement;
      if (input) input.value = '';
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      toast({
        title: "Error",
        description: "Failed to process PDF file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Upload Epic Series PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pdf-upload">Select PDF File</Label>
          <Input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </div>

        {selectedFile && (
          <div className="flex items-center p-3 bg-blue-50 rounded-lg">
            <FileText className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-700">{selectedFile.name}</span>
          </div>
        )}

        <div className="flex items-start space-x-2 p-3 bg-yellow-50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <p className="font-medium">Note:</p>
            <p>This is a demo implementation. In production, this would extract actual data and images from your PDF file.</p>
          </div>
        </div>

        <Button 
          onClick={processPDF} 
          disabled={!selectedFile || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing PDF...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Extract Mobile Home Data
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
