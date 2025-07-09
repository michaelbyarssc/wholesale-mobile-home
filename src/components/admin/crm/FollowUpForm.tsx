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

interface FollowUpFormProps {
  leads: any[];
  onSave: () => void;
  leadId?: string;
}

export const FollowUpForm = ({ leads, onSave, leadId }: FollowUpFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lead_id: leadId || '',
    title: '',
    description: '',
    follow_up_type: 'call',
    priority: 'medium',
    due_date: new Date()
  });

  const followUpTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'task', label: 'Task' },
    { value: 'reminder', label: 'Reminder' }
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        due_date: formData.due_date.toISOString()
      };

      const { error } = await supabase
        .from('follow_ups')
        .insert([submitData]);

      if (error) throw error;

      // Update next_follow_up_at on the lead
      if (formData.lead_id) {
        await supabase
          .from('leads')
          .update({ next_follow_up_at: formData.due_date.toISOString() })
          .eq('id', formData.lead_id);
      }

      toast({
        title: "Success",
        description: "Follow-up scheduled successfully",
      });

      onSave();
    } catch (error: any) {
      console.error('Error saving follow-up:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to schedule follow-up",
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
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Follow-up call about pricing"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Follow-up Type</Label>
          <Select 
            value={formData.follow_up_type} 
            onValueChange={(value) => setFormData({ ...formData, follow_up_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {followUpTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Priority</Label>
          <Select 
            value={formData.priority} 
            onValueChange={(value) => setFormData({ ...formData, priority: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorities.map(priority => (
                <SelectItem key={priority.value} value={priority.value}>
                  {priority.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Due Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(formData.due_date, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={formData.due_date}
              onSelect={(date) => date && setFormData({ ...formData, due_date: date })}
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Additional details about this follow-up..."
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSave}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Schedule Follow-up
        </Button>
      </div>
    </form>
  );
};