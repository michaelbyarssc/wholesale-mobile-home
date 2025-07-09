import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InteractionFormProps {
  leads: any[];
  onSave: () => void;
  leadId?: string;
}

export const InteractionForm = ({ leads, onSave, leadId }: InteractionFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lead_id: leadId || '',
    interaction_type: 'call',
    subject: '',
    description: '',
    outcome: '',
    scheduled_at: undefined as Date | undefined,
    completed_at: new Date()
  });

  const interactionTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'website_visit', label: 'Website Visit' },
    { value: 'estimate_request', label: 'Estimate Request' },
    { value: 'demo', label: 'Demo' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'note', label: 'Note' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        scheduled_at: formData.scheduled_at?.toISOString() || null,
        completed_at: formData.completed_at?.toISOString() || null
      };

      const { error } = await supabase
        .from('customer_interactions')
        .insert([submitData]);

      if (error) throw error;

      // Update last_contacted_at on the lead
      if (formData.lead_id) {
        await supabase
          .from('leads')
          .update({ last_contacted_at: new Date().toISOString() })
          .eq('id', formData.lead_id);
      }

      toast({
        title: "Success",
        description: "Interaction logged successfully",
      });

      onSave();
    } catch (error: any) {
      console.error('Error saving interaction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to log interaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Lead</Label>
        <Select 
          value={formData.lead_id} 
          onValueChange={(value) => setFormData({ ...formData, lead_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a lead" />
          </SelectTrigger>
          <SelectContent>
            {leads.map(lead => (
              <SelectItem key={lead.id} value={lead.id}>
                {lead.first_name} {lead.last_name} - {lead.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Interaction Type</Label>
        <Select 
          value={formData.interaction_type} 
          onValueChange={(value) => setFormData({ ...formData, interaction_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {interactionTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          placeholder="Brief description of the interaction"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Detailed notes about the interaction..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outcome">Outcome</Label>
        <Textarea
          id="outcome"
          value={formData.outcome}
          onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
          rows={2}
          placeholder="What was the result or next action?"
        />
      </div>

      <div className="space-y-2">
        <Label>Scheduled Date (if applicable)</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.scheduled_at ? format(formData.scheduled_at, "PPP") : "Not scheduled"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.scheduled_at}
              onSelect={(date) => setFormData({ ...formData, scheduled_at: date })}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSave}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Interaction
        </Button>
      </div>
    </form>
  );
};