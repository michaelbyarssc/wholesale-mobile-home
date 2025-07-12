import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send, RefreshCw } from "lucide-react";

interface DocuSignButtonProps {
  deliveryId: string;
  customerEmail: string;
  customerName: string;
  deliveryNumber: string;
}

export const DocuSignButton = ({ deliveryId, customerEmail, customerName, deliveryNumber }: DocuSignButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [useCustomDocuments, setUseCustomDocuments] = useState(false);
  const [documentType, setDocumentType] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    mutationFn: async (data: { deliveryId: string; templateId: string; customerEmail: string; customerName: string; templateName: string }) => {
      const { data: result, error } = await supabase.functions.invoke('docusign-send-template', {
        body: data
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Template Sent Successfully",
        description: `Document has been sent to ${customerEmail} for signing using your DocuSign template.`,
      });
      setIsOpen(false);
      setSelectedTemplate("");
      queryClient.invalidateQueries({ queryKey: ["delivery-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Template",
        description: error.message || "There was an error sending the template for signing.",
        variant: "destructive",
      });
    },
  });

  // Send custom document (legacy)
  const sendDocumentMutation = useMutation({
    mutationFn: async (data: { deliveryId: string; customerEmail: string; customerName: string; documentType: string }) => {
      const { data: result, error } = await supabase.functions.invoke('docusign-send-envelope', {
        body: data
      });

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Document Sent Successfully",
        description: `${documentType.replace('_', ' ')} has been sent to ${customerEmail} for signing.`,
      });
      setIsOpen(false);
      setDocumentType("");
      queryClient.invalidateQueries({ queryKey: ["delivery-documents"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Document",
        description: error.message || "There was an error sending the document for signing.",
        variant: "destructive",
      });
    },
  });

  const handleSendDocument = () => {
    if (useCustomDocuments) {
      // Send custom document
      if (!documentType) {
        toast({
          title: "Please select a document type",
          variant: "destructive",
        });
        return;
      }

      sendDocumentMutation.mutate({
        deliveryId,
        customerEmail,
        customerName,
        documentType,
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
        deliveryId,
        templateId: selectedTemplate,
        customerEmail,
        customerName,
        templateName: template.name,
      });
    }
  };

  const documentTypes = [
    { value: "delivery_receipt", label: "Delivery Receipt" },
    { value: "service_agreement", label: "Service Agreement" },
    { value: "completion_form", label: "Completion Form" },
  ];

  const isLoading = sendTemplateMutation.isPending || sendDocumentMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Send Document
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
                    setDocumentType("");
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
            <label className="text-sm font-medium">Custom Documents</label>
            <Select 
              value={useCustomDocuments ? documentType : ""} 
              onValueChange={(value) => {
                setDocumentType(value);
                setUseCustomDocuments(true);
                setSelectedTemplate("");
              }}
              disabled={!useCustomDocuments && selectedTemplate !== ""}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-1 text-xs text-muted-foreground">
              Generate simple documents on-the-fly
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendDocument}
              disabled={isLoading || (!selectedTemplate && !documentType)}
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
                  Send Document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};