
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ScrapingResult {
  success: boolean;
  message: string;
  data?: {
    totalProcessed: number;
    created: number;
    updated: number;
    homes: Array<{ display_name: string; model: string }>;
  };
  error?: string;
}

export const OwnTruScraper = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScrapingResult | null>(null);

  const handleScrapeOwnTru = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      console.log('Starting OwnTru scraping...');
      console.log('Calling edge function: scrape-owntru-models');
      
      const { data, error } = await supabase.functions.invoke('scrape-owntru-models', {
        body: { timestamp: new Date().toISOString() }
      });
      
      console.log('Edge function response:', { data, error });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      setResult(data);
      
      if (data?.success) {
        toast({
          title: "Success!",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data?.message || "Failed to scrape OwnTru models",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scraping OwnTru models:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check for specific network errors
      if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error: Unable to connect to the scraping service. Please check your internet connection and try again.';
      } else if (errorMessage.includes('FunctionsFetchError')) {
        errorMessage = 'Service unavailable: The scraping function is temporarily unavailable. Please try again in a few minutes.';
      }
      
      setResult({
        success: false,
        message: 'Failed to scrape OwnTru models',
        error: errorMessage
      });
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          OwnTru Models Scraper
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>This tool will scrape mobile home data from OwnTru.com including:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Model names and descriptions</li>
            <li>Square footage</li>
            <li>Bedrooms and bathrooms</li>
            <li>Dimensions (length × width)</li>
            <li>Features and specifications</li>
          </ul>
          <p className="mt-3 text-amber-600">
            <strong>Note:</strong> This process may take 2-5 minutes to complete as it crawls multiple pages.
          </p>
        </div>

        <Button
          onClick={handleScrapeOwnTru}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scraping OwnTru Models...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Scrape OwnTru Models
            </>
          )}
        </Button>

        {result && (
          <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{result.message}</p>
                
                {result.success && result.data && (
                  <div className="text-sm">
                    <p>• Total processed: {result.data.totalProcessed}</p>
                    <p>• New homes created: {result.data.created}</p>
                    <p>• Existing homes updated: {result.data.updated}</p>
                    
                    {result.data.homes.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">View processed models</summary>
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          {result.data.homes.map((home, index) => (
                            <div key={index} className="text-xs py-1">
                              {home.display_name} ({home.model})
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
                
                {!result.success && result.error && (
                  <div className="text-sm text-red-600">
                    <p className="font-medium">Error Details:</p>
                    <p>{result.error}</p>
                    <p className="mt-2 text-xs">
                      If this error persists, please check:
                    </p>
                    <ul className="text-xs list-disc list-inside mt-1">
                      <li>Your internet connection</li>
                      <li>That the Firecrawl API key is properly configured</li>
                      <li>The edge function logs for more details</li>
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
