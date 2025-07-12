import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send } from "lucide-react";

interface DocuSignButtonProps {
  deliveryId: string;
  customerEmail: string;
  customerName: string;
  deliveryNumber: string;
}

export const DocuSignButton = ({ deliveryId, customerEmail, customerName, deliveryNumber }: DocuSignButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [documentType, setDocumentType] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  };

  const documentTypes = [
    { value: "delivery_receipt", label: "Delivery Receipt" },
    { value: "service_agreement", label: "Service Agreement" },
    { value: "completion_form", label: "Completion Form" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Send Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Document for Signing</DialogTitle>
          <DialogDescription>
            Send a document to {customerName} ({customerEmail}) for digital signing via DocuSign.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Document Type</label>
            <Select value={documentType} onValueChange={setDocumentType}>
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
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendDocument}
              disabled={sendDocumentMutation.isPending || !documentType}
              className="flex items-center gap-2"
            >
              {sendDocumentMutation.isPending ? (
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