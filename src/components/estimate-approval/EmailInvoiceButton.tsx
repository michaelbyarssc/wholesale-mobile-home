import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";

interface EmailInvoiceButtonProps {
  invoiceId: string;
  customerEmail: string;
  customerName: string;
  invoiceNumber: string;
}

export const EmailInvoiceButton = ({ 
  invoiceId, 
  customerEmail, 
  customerName, 
  invoiceNumber 
}: EmailInvoiceButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
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

  // Send email invoice
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const { data: result, error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId,
          customerEmail,
          customerName
        }
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Sent Successfully",
        description: `Invoice ${invoiceNumber} has been sent to ${customerEmail} via email.`,
      });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error: any) => {
      console.error('Email sending error:', error);
      toast({
        title: "Failed to Send Invoice",
        description: error.message || "There was an error sending the invoice via email.",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    sendEmailMutation.mutate();
  };

  const isLoading = sendEmailMutation.isPending;

  // Only show this button when DocuSign is disabled
  if (isDocuSignEnabled) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Send Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md mx-auto p-6 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg z-50">
        <DialogHeader>
          <DialogTitle>Send Invoice via Email</DialogTitle>
          <DialogDescription>
            Send invoice {invoiceNumber} to {customerName} ({customerEmail}) via email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              This will send a professional invoice email to the customer with all invoice details and mobile home specifications.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail}
              disabled={isLoading}
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
                  Send Invoice
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};