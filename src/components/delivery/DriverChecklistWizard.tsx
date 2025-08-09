import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, ClipboardList, Signature } from "lucide-react";
import { DeliveryPhotoCapture } from "./DeliveryPhotoCapture";
import { toast } from "sonner";

interface DriverChecklistWizardProps {
  open: boolean;
  onClose: () => void;
  deliveryId: string;
  driverId: string;
  currentStatus?: string;
}

// Minimal required categories per guided step
const STEP_DEFS = [
  {
    key: "pickup",
    title: "Factory Pickup",
    description: "Take pre-delivery photos and verify no visible damage.",
    required: ["pre_delivery"],
    statusOnNext: "in_transit" as const,
  },
  {
    key: "transit",
    title: "In Transit",
    description: "Drive safely. Update status when you arrive at the site.",
    required: [] as string[],
    statusOnNext: "delivery_in_progress" as const,
    statusOnEnter: "in_transit" as const,
  },
  {
    key: "onsite",
    title: "On Site & Placement",
    description: "After placement, take post-delivery photos showing the final setup.",
    required: ["post_delivery"],
    // No status change here; next step captures signature which marks delivered
  },
  {
    key: "handoff",
    title: "Customer Handoff",
    description: "Capture the customer's signature to finalize delivery.",
    required: ["signature"],
    // Signature upload will set status to delivered via upload function
  },
];

export const DriverChecklistWizard = ({ open, onClose, deliveryId, driverId, currentStatus }: DriverChecklistWizardProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  // Move to the most relevant step based on current delivery status
  useEffect(() => {
    if (!currentStatus) return;
    const mapping: Record<string, number> = {
      scheduled: 0,
      factory_pickup_scheduled: 0,
      factory_pickup_in_progress: 0,
      factory_pickup_completed: 1,
      in_transit: 1,
      delivery_in_progress: 2,
      delivered: 3,
    };
    const idx = mapping[currentStatus] ?? 0;
    setStepIndex(idx);
  }, [currentStatus]);

  // Fetch photos for this delivery to validate required items
  const { data: photos, refetch, isFetching } = useQuery({
    queryKey: ["delivery-photos", deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_photos")
        .select("id, photo_type, photo_url, taken_at")
        .eq("delivery_id", deliveryId)
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
    refetchInterval: 10000,
  });

  const currentStep = STEP_DEFS[stepIndex];

  const hasRequired = useMemo(() => {
    if (!photos) return false;
    if (!currentStep.required.length) return true;
    return currentStep.required.every((req) => photos.some((p: any) => p.photo_type === req));
  }, [photos, currentStep]);

  const goNext = async () => {
    try {
      // Guard required items
      if (!hasRequired) {
        toast.warning("Please complete the required items before continuing.");
        return;
      }

      // Status transition if defined
      const nextStatus = currentStep.statusOnNext;
      if (nextStatus) {
        const { error } = await supabase
          .from("deliveries")
          .update({ status: nextStatus as any })
          .eq("id", deliveryId);
        if (error) throw error;
      }

      if (stepIndex < STEP_DEFS.length - 1) {
        setStepIndex((i) => i + 1);
        await refetch();
      } else {
        toast.success("Checklist complete. Great job!");
        onClose();
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to advance step");
    }
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  // If a step defines a status on enter, apply it once when the step becomes active
  useEffect(() => {
    const applyOnEnter = async () => {
      const statusOnEnter = STEP_DEFS[stepIndex]?.statusOnEnter;
      if (!statusOnEnter) return;
      await supabase.from("deliveries").update({ status: statusOnEnter as any }).eq("id", deliveryId);
    };
    if (open) applyOnEnter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Guided Driver Checklist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStep.description}</p>
            </div>
            <Badge variant="secondary">Step {stepIndex + 1} of {STEP_DEFS.length}</Badge>
          </div>

          {/* Photo capture area */}
          <div className="border rounded-lg p-3 bg-muted/40">
            <DeliveryPhotoCapture 
              deliveryId={deliveryId}
              driverId={driverId}
              currentPhase={currentStep.key}
            />
          </div>

          {/* Required status */}
          <div className="flex items-center gap-2 text-sm">
            {hasRequired ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Required items for this step are complete.</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Missing required: {currentStep.required.join(", ") || "None"}</span>
              </>
            )}
            {currentStep.required.includes("signature") && (
              <span className="inline-flex items-center gap-1 ml-2 text-muted-foreground">
                <Signature className="h-4 w-4" /> Signature is required to finish
              </span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={goBack} disabled={stepIndex === 0}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Close</Button>
              <Button onClick={goNext} disabled={isFetching || (!hasRequired && STEP_DEFS[stepIndex].required.length > 0)}>
                {stepIndex === STEP_DEFS.length - 1 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finish
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Next
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
