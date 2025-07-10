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

interface LeadFormProps {
  leadSources: any[];
  onSave: () => void;
  lead?: any;
  currentUserId?: string;
}

export const LeadForm = ({ leadSources, onSave, lead, currentUserId }: LeadFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: lead?.first_name || '',
    last_name: lead?.last_name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    company: lead?.company || '',
    status: lead?.status || 'new',
    lead_source_id: lead?.lead_source_id || '',
    lead_score: lead?.lead_score || 0,
    estimated_budget: lead?.estimated_budget || '',
    estimated_timeline: lead?.estimated_timeline || '',
    notes: lead?.notes || '',
    next_follow_up_at: lead?.next_follow_up_at ? new Date(lead.next_follow_up_at) : undefined
  });

  const leadStatuses = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' },
    { value: 'nurturing', label: 'Nurturing' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('LeadForm - Creating lead with currentUserId:', currentUserId);
      console.log('LeadForm - Form data:', formData);
      
      const submitData = {
        ...formData,
        estimated_budget: formData.estimated_budget ? parseFloat(formData.estimated_budget as string) : null,
        next_follow_up_at: formData.next_follow_up_at?.toISOString() || null,
        // Associate new leads with the current user
        ...(lead ? {} : { 
          user_id: currentUserId,
          assigned_to: currentUserId 
        })
      };
      
      console.log('LeadForm - Submit data:', submitData);

      let error;
      if (lead) {
        // Update existing lead
        const { error: updateError } = await supabase
          .from('leads')
          .update(submitData)
          .eq('id', lead.id);
        error = updateError;
      } else {
        // Create new lead
        const { data: insertData, error: insertError } = await supabase
          .from('leads')
          .insert([submitData])
          .select();
        
        console.log('LeadForm - Insert result:', insertData, 'error:', insertError);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Lead ${lead ? 'updated' : 'created'} successfully`,
      });

      onSave();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${lead ? 'update' : 'create'} lead`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leadStatuses.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Lead Source</Label>
          <Select value={formData.lead_source_id} onValueChange={(value) => setFormData({ ...formData, lead_source_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {leadSources.map(source => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lead_score">Lead Score (0-100)</Label>
          <Input
            id="lead_score"
            type="number"
            min="0"
            max="100"
            value={formData.lead_score}
            onChange={(e) => setFormData({ ...formData, lead_score: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estimated_budget">Estimated Budget</Label>
          <Input
            id="estimated_budget"
            type="number"
            value={formData.estimated_budget}
            onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
            placeholder="75000"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimated_timeline">Estimated Timeline</Label>
        <Input
          id="estimated_timeline"
          value={formData.estimated_timeline}
          onChange={(e) => setFormData({ ...formData, estimated_timeline: e.target.value })}
          placeholder="Within 3 months"
        />
      </div>

      <div className="space-y-2">
        <Label>Next Follow-up Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.next_follow_up_at ? format(formData.next_follow_up_at, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.next_follow_up_at}
              onSelect={(date) => setFormData({ ...formData, next_follow_up_at: date })}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Additional notes about this lead..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSave}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {lead ? 'Update' : 'Create'} Lead
        </Button>
      </div>
    </form>
  );
};