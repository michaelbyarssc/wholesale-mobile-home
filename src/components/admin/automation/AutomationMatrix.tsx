import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MessageSquare } from "lucide-react";

// Simple, kid-friendly matrix to turn on Email/SMS per event and pick a template
// Writes immediately on change to keep UX simple

type Channel = "email" | "sms";

type EventKey =
  | "estimate_sent"
  | "estimate_approved"
  | "invoice_created"
  | "payment_made"
  | "delivery_scheduled"
  | "delivery_in_progress"
  | "delivery_arrived"
  | "delivery_finished"
  | "home_ready_for_delivery";

const EVENTS: { key: EventKey; label: string }[] = [
  { key: "estimate_sent", label: "Estimate Sent" },
  { key: "estimate_approved", label: "Estimate Approved" },
  { key: "invoice_created", label: "Invoice Created" },
  { key: "payment_made", label: "Payment Made" },
  { key: "delivery_scheduled", label: "Delivery Scheduled" },
  { key: "delivery_in_progress", label: "Delivery In Progress" },
  { key: "delivery_arrived", label: "Delivery Arrived" },
  { key: "delivery_finished", label: "Delivery Finished" },
  { key: "home_ready_for_delivery", label: "Home Ready for Delivery" },
];

interface MessageTemplate {
  id: string;
  name: string;
  template_type: Channel;
}

interface ExistingAutomation {
  id: string;
  trigger_event: EventKey;
  active: boolean;
  message_template_id: string;
  automation_message_templates?: {
    template_type: Channel;
    name: string;
  } | null;
}

interface CellState {
  automationId?: string;
  enabled: boolean;
  templateId?: string;
}

export function AutomationMatrix() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [emailTemplates, setEmailTemplates] = useState<MessageTemplate[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<MessageTemplate[]>([]);
  const [matrix, setMatrix] = useState<Record<EventKey, { email: CellState; sms: CellState }>>({
    estimate_sent: { email: { enabled: false }, sms: { enabled: false } },
    estimate_approved: { email: { enabled: false }, sms: { enabled: false } },
    invoice_created: { email: { enabled: false }, sms: { enabled: false } },
    payment_made: { email: { enabled: false }, sms: { enabled: false } },
    delivery_scheduled: { email: { enabled: false }, sms: { enabled: false } },
    delivery_in_progress: { email: { enabled: false }, sms: { enabled: false } },
    delivery_arrived: { email: { enabled: false }, sms: { enabled: false } },
    delivery_finished: { email: { enabled: false }, sms: { enabled: false } },
    home_ready_for_delivery: { email: { enabled: false }, sms: { enabled: false } },
  });

  const load = async () => {
    setLoading(true);
    try {
      const [emailRes, smsRes, automationsRes] = await Promise.all([
        supabase
          .from("automation_message_templates")
          .select("id, name, template_type")
          .eq("active", true)
          .eq("template_type", "email"),
        supabase
          .from("automation_message_templates")
          .select("id, name, template_type")
          .eq("active", true)
          .eq("template_type", "sms"),
        supabase
          .from("automation_templates")
          .select("id, trigger_event, active, message_template_id, automation_message_templates(template_type, name)")
          .in(
            "trigger_event",
            EVENTS.map((e) => e.key)
          )
          .eq("trigger_type", "event_based"),
      ]);

      if (emailRes.error) throw emailRes.error;
      if (smsRes.error) throw smsRes.error;
      if (automationsRes.error) throw automationsRes.error;

      setEmailTemplates((emailRes.data as any) || []);
      setSmsTemplates((smsRes.data as any) || []);

      const next = { ...matrix };
      (automationsRes.data as ExistingAutomation[] | null)?.forEach((a) => {
        const channel = a.automation_message_templates?.template_type as Channel | undefined;
        if (!channel) return;
        const eventKey = a.trigger_event as EventKey;
        next[eventKey] = next[eventKey] || { email: { enabled: false }, sms: { enabled: false } };
        next[eventKey][channel] = {
          automationId: a.id,
          enabled: !!a.active,
          templateId: a.message_template_id,
        };
      });
      setMatrix(next);
    } catch (error) {
      console.error("Failed to load automation matrix", error);
      toast({ title: "Error", description: "Could not load automations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTemplatesFor = (channel: Channel) => (channel === "email" ? emailTemplates : smsTemplates);

  const upsertAutomation = async (
    eventKey: EventKey,
    channel: Channel,
    updates: Partial<{ enabled: boolean; templateId: string }>
  ) => {
    const row = matrix[eventKey][channel];
    const currentTemplateId = updates.templateId ?? row.templateId;
    const enabled = updates.enabled ?? row.enabled;

    if (enabled && !currentTemplateId) {
      toast({ title: "Pick a template", description: `Select a ${channel.toUpperCase()} template first` });
      return;
    }

    try {
      const name = `${EVENTS.find((e) => e.key === eventKey)?.label} - ${channel.toUpperCase()}`;
      const payload: any = {
        name,
        trigger_type: "event_based",
        trigger_event: eventKey,
        target_audience: "customers",
        active: enabled,
        message_template_id: currentTemplateId || null,
      };

      let res;
      if (row.automationId) {
        res = await supabase
          .from("automation_templates")
          .update(payload)
          .eq("id", row.automationId)
          .select("id")
          .single();
      } else {
        res = await supabase
          .from("automation_templates")
          .insert(payload)
          .select("id")
          .single();
      }

      if (res.error) throw res.error;

      const newId = res.data?.id as string | undefined;
      setMatrix((prev) => ({
        ...prev,
        [eventKey]: {
          ...prev[eventKey],
          [channel]: { automationId: newId ?? row.automationId, enabled, templateId: currentTemplateId },
        },
      }));

      toast({ title: "Saved", description: `${name} updated` });
    } catch (error) {
      console.error("Failed to save automation", error);
      toast({ title: "Error", description: "Could not save automation", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Quick Automations</h3>
        <p className="text-muted-foreground">Flip a switch and pick a template. That’s it.</p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> SMS
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {EVENTS.map(({ key, label }) => (
              <TableRow key={key}>
                <TableCell className="font-medium">{label}</TableCell>

                {/* Email cell */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={!!matrix[key].email.enabled}
                      onCheckedChange={(v) => upsertAutomation(key, "email", { enabled: v })}
                    />
                    <Select
                      value={matrix[key].email.templateId}
                      onValueChange={(val) => upsertAutomation(key, "email", { templateId: val })}
                      disabled={!emailTemplates.length}
                    >
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Choose email template" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {matrix[key].email.enabled ? (
                      <Badge variant="outline">On</Badge>
                    ) : (
                      <Badge variant="secondary">Off</Badge>
                    )}
                  </div>
                </TableCell>

                {/* SMS cell */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={!!matrix[key].sms.enabled}
                      onCheckedChange={(v) => upsertAutomation(key, "sms", { enabled: v })}
                    />
                    <Select
                      value={matrix[key].sms.templateId}
                      onValueChange={(val) => upsertAutomation(key, "sms", { templateId: val })}
                      disabled={!smsTemplates.length}
                    >
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder="Choose SMS template" />
                      </SelectTrigger>
                      <SelectContent>
                        {smsTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {matrix[key].sms.enabled ? (
                      <Badge variant="outline">On</Badge>
                    ) : (
                      <Badge variant="secondary">Off</Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
