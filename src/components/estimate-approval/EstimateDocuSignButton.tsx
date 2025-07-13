import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, RefreshCw } from "lucide-react";

interface EstimateDocuSignButtonProps {
  estimateId: string;
  customerEmail: string;
  customerName: string;
  estimateNumber: string;
  documentType?: 'estimate' | 'invoice';
  hasInvoice?: boolean;
}

export const EstimateDocuSignButton = ({ 
  estimateId, 
  customerEmail, 
  customerName, 
  estimateNumber,
  documentType = 'estimate',
  hasInvoice = false
}: EstimateDocuSignButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [useCustomDocuments, setUseCustomDocuments] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<'estimate' | 'invoice'>(documentType);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if DocuSign is enabled
  const { data: docuSignEnabledData } = useQuery({
    queryKey: ["admin-settings", "docusign_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('setting_key', 'docusign_enabled')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching DocuSign setting:', error);
        return { setting_value: 'false' };
      }
      
      return data || { setting_value: 'false' };
    }
  });

  const isDocuSignEnabled = docuSignEnabledData?.setting_value === 'true';

  // Fetch DocuSign templates
  const { data: templatesData, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ["docusign-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('docusign-get-templates');
      if (error) throw error;
      return data;
    },
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Send template-based document
  const sendTemplateMutation = useMutation({
    mutationFn: async (data: { 
      estimateId: string; 
      templateId: string; 
      templateName: string; 
      documentType: 'estimate' | 'invoice' 
    }) => {
      const { data: result, error } = await supabase.functions.invoke('docusign-send-estimate', {
        body: data
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Template Sent Successfully",
        description: `${selectedDocumentType.charAt(0).toUpperCase() + selectedDocumentType.slice(1)} has been sent to ${customerEmail} for signing using your DocuSign template.`,
      });
      setIsOpen(false);
      setSelectedTemplate("");
      queryClient.invalidateQueries({ queryKey: ["estimate-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Template",
        description: error.message || "There was an error sending the template for signing.",
        variant: "destructive",
      });
    },
  });

  // Send custom document
  const sendDocumentMutation = useMutation({
    mutationFn: async (data: { 
      estimateId: string; 
      documentType: 'estimate' | 'invoice' 
    }) => {
      const { data: result, error } = await supabase.functions.invoke('docusign-send-estimate', {
        body: data
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Document Sent Successfully",
        description: `${selectedDocumentType.charAt(0).toUpperCase() + selectedDocumentType.slice(1)} has been sent to ${customerEmail} for signing.`,
      });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["estimate-documents"] });
    },
    onError: (error: any) => {
      console.error('Document sending error:', error);
      toast({
        title: "Failed to Send Document",
        description: error.message || "There was an error sending the document for signing.",
        variant: "destructive",
      });
      // Reset state on error
      setUseCustomDocuments(false);
    },
  });

  const handleSendDocument = () => {
    if (useCustomDocuments) {
      // Send custom document
      sendDocumentMutation.mutate({
        estimateId,
        documentType: selectedDocumentType,
      });
    } else {
      // Send template
      if (!selectedTemplate) {
        toast({
          title: "Please select a template",
          variant: "destructive",
        });
        return;
      }

      const template = templatesData?.templates?.find((t: any) => t.id === selectedTemplate);
      if (!template) {
        toast({
          title: "Template not found",
          variant: "destructive",
        });
        return;
      }

      sendTemplateMutation.mutate({
        estimateId,
        templateId: selectedTemplate,
        templateName: template.name,
        documentType: selectedDocumentType,
      });
    }
  };

  const isLoading = sendTemplateMutation.isPending || sendDocumentMutation.isPending;
  const buttonText = documentType === 'invoice' ? 'Send Invoice' : 'Send Estimate';

  // Don't render the button if DocuSign is disabled
  if (!isDocuSignEnabled) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Document for Signing</DialogTitle>
          <DialogDescription>
            Send a document to {customerName} ({customerEmail}) for digital signing via DocuSign.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Document Type Selection */}
          <div>
            <label className="text-sm font-medium">Document Type</label>
            <Select 
              value={selectedDocumentType} 
              onValueChange={(value: 'estimate' | 'invoice') => setSelectedDocumentType(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estimate">Estimate</SelectItem>
                {hasInvoice && <SelectItem value="invoice">Invoice</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* Templates Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">DocuSign Templates</label>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchTemplates()}
                disabled={templatesLoading}
                className="h-6 px-2"
              >
                <RefreshCw className={`h-3 w-3 ${templatesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            
            {templatesLoading ? (
              <div className="text-sm text-muted-foreground">Loading templates...</div>
            ) : templatesData?.templates?.length > 0 ? (
              <>
                <Select 
                  value={useCustomDocuments ? "" : selectedTemplate} 
                  onValueChange={(value) => {
                    setSelectedTemplate(value);
                    setUseCustomDocuments(false);
                  }}
                  disabled={useCustomDocuments}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a DocuSign template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templatesData.templates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{template.name}</span>
                          {template.shared && <Badge variant="secondary" className="ml-2 text-xs">Shared</Badge>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 text-xs text-muted-foreground">
                  Found {templatesData.templates.length} template(s) in your DocuSign account
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No templates found. Create templates in your DocuSign account first.
              </div>
            )}
          </div>

          {/* OR Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 border-t"></div>
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 border-t"></div>
          </div>

          {/* Custom Documents Section */}
          <div>
            <label className="text-sm font-medium">Generate Custom Document</label>
            <Button
              variant={useCustomDocuments ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setUseCustomDocuments(!useCustomDocuments);
                if (!useCustomDocuments) {
                  setSelectedTemplate("");
                }
              }}
              className="mt-1 w-full"
              disabled={!useCustomDocuments && selectedTemplate !== ""}
            >
              {useCustomDocuments ? "Using Custom Document" : "Use Custom Document"}
            </Button>
            <div className="mt-1 text-xs text-muted-foreground">
              Generate a simple document on-the-fly with estimate/invoice details
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendDocument}
              disabled={isLoading || (!selectedTemplate && !useCustomDocuments)}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send {selectedDocumentType.charAt(0).toUpperCase() + selectedDocumentType.slice(1)}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};