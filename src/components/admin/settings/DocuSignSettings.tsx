import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Settings, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocuSignSettingsProps {
  settings: Record<string, string>;
  onInputChange: (key: string, value: string) => void;
  onUpdateSetting: (key: string, value: string) => Promise<void>;
}

export const DocuSignSettings: React.FC<DocuSignSettingsProps> = ({
  settings,
  onInputChange,
  onUpdateSetting,
}) => {
  const { toast } = useToast();
  const isDocuSignEnabled = settings.docusign_enabled === 'true';

  const handleDocuSignToggle = async (enabled: boolean) => {
    try {
      await onUpdateSetting('docusign_enabled', enabled.toString());
      onInputChange('docusign_enabled', enabled.toString());
      
      toast({
        title: "DocuSign Settings Updated",
        description: `DocuSign integration has been ${enabled ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating DocuSign setting:', error);
      toast({
        title: "Error",
        description: "Failed to update DocuSign settings",
        variant: "destructive",
      });
    }
  };

  const testDocuSignConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('docusign-get-templates');
      
      if (error) {
        toast({
          title: "DocuSign Connection Failed",
          description: "Please check your DocuSign credentials in the edge function secrets.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "DocuSign Connection Successful",
          description: `Found ${data?.templates?.length || 0} template(s) in your DocuSign account.`,
        });
      }
    } catch (error) {
      toast({
        title: "DocuSign Connection Failed",
        description: "Unable to connect to DocuSign. Please verify your credentials.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <CardTitle>DocuSign Integration</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="docusign-enabled">Enable DocuSign Integration</Label>
            <p className="text-sm text-muted-foreground">
              Allow sending estimates and invoices for digital signing via DocuSign
            </p>
          </div>
          <Switch
            id="docusign-enabled"
            checked={isDocuSignEnabled}
            onCheckedChange={handleDocuSignToggle}
          />
        </div>

        {isDocuSignEnabled && (
          <div className="space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                DocuSign integration requires API credentials to be configured in Supabase Edge Function secrets.
                Make sure you have set up DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, 
                DOCUSIGN_CLIENT_SECRET, and DOCUSIGN_PRIVATE_KEY.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={testDocuSignConnection}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Test Connection
              </Button>
              
              <Button
                variant="outline"
                asChild
              >
                <a 
                  href="https://supabase.com/dashboard/project/vgdreuwmisludqxphsph/settings/functions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Configure Secrets
                </a>
              </Button>
            </div>
          </div>
        )}

        {!isDocuSignEnabled && (
          <Alert>
            <AlertDescription>
              DocuSign integration is currently disabled. Enable it to allow sending documents for digital signing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};