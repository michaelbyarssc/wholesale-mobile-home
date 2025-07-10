import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, Clock, MessageSquare, User, Phone, Mail, MapPin, DollarSign, Calendar, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatInteraction {
  id: string;
  chat_session_id: string;
  subject: string;
  description: string;
  chat_transcript: string;
  captured_data: any;
  confidence_scores: any;
  extraction_reviewed: boolean;
  page_source: string;
  created_at: string;
  completed_at: string;
  leads?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    status: string;
  };
}

export const ChatLeadsReview: React.FC = () => {
  const [interactions, setInteractions] = useState<ChatInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInteraction, setSelectedInteraction] = useState<ChatInteraction | null>(null);
  const [editedData, setEditedData] = useState<any>({});
  const { toast } = useToast();

  const loadInteractions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_interactions')
        .select(`
          *,
          leads (
            id,
            first_name,
            last_name,
            email,
            phone,
            status
          )
        `)
        .eq('interaction_type', 'chat')
        .not('chat_session_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error loading chat interactions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat interactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInteractions();
  }, []);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const handleApproveExtraction = async (interaction: ChatInteraction) => {
    try {
      const { error } = await supabase
        .from('customer_interactions')
        .update({ extraction_reviewed: true })
        .eq('id', interaction.id);

      if (error) throw error;

      toast({
        title: "Approved",
        description: "Chat data extraction has been approved"
      });

      loadInteractions();
    } catch (error) {
      console.error('Error approving extraction:', error);
      toast({
        title: "Error",
        description: "Failed to approve extraction",
        variant: "destructive"
      });
    }
  };

  const handleUpdateExtraction = async (interaction: ChatInteraction) => {
    try {
      const { error } = await supabase
        .from('customer_interactions')
        .update({ 
          captured_data: editedData,
          extraction_reviewed: true
        })
        .eq('id', interaction.id);

      if (error) throw error;

      toast({
        title: "Updated",
        description: "Chat data has been updated and approved"
      });

      setSelectedInteraction(null);
      setEditedData({});
      loadInteractions();
    } catch (error) {
      console.error('Error updating extraction:', error);
      toast({
        title: "Error",
        description: "Failed to update extraction",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (interaction: ChatInteraction) => {
    setSelectedInteraction(interaction);
    setEditedData({ ...interaction.captured_data });
  };

  const pendingReview = interactions.filter(i => !i.extraction_reviewed);
  const approved = interactions.filter(i => i.extraction_reviewed);

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading chat leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chat Leads Review</h2>
          <p className="text-muted-foreground">Review and approve AI-extracted data from chat conversations</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-yellow-50">
            {pendingReview.length} Pending Review
          </Badge>
          <Badge variant="outline" className="bg-green-50">
            {approved.length} Approved
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Review ({pendingReview.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Approved ({approved.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingReview.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No pending chat reviews</p>
              </CardContent>
            </Card>
          ) : (
            pendingReview.map((interaction) => (
              <ChatInteractionCard
                key={interaction.id}
                interaction={interaction}
                onApprove={() => handleApproveExtraction(interaction)}
                onEdit={() => openEditDialog(interaction)}
                showActions={true}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approved.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No approved chat reviews yet</p>
              </CardContent>
            </Card>
          ) : (
            approved.map((interaction) => (
              <ChatInteractionCard
                key={interaction.id}
                interaction={interaction}
                showActions={false}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={selectedInteraction !== null} onOpenChange={() => setSelectedInteraction(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Extracted Data</DialogTitle>
            <DialogDescription>
              Review and edit the AI-extracted data from the chat conversation
            </DialogDescription>
          </DialogHeader>

          {selectedInteraction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="beds">Bedrooms</Label>
                  <Input
                    id="beds"
                    type="number"
                    value={editedData.beds || ''}
                    onChange={(e) => setEditedData(prev => ({ ...prev, beds: parseInt(e.target.value) || null }))}
                  />
                </div>
                <div>
                  <Label htmlFor="baths">Bathrooms</Label>
                  <Input
                    id="baths"
                    type="number"
                    value={editedData.baths || ''}
                    onChange={(e) => setEditedData(prev => ({ ...prev, baths: parseInt(e.target.value) || null }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="timeframe">Timeframe</Label>
                <Input
                  id="timeframe"
                  value={editedData.timeframe || ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, timeframe: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="buyer_type">Buyer Type</Label>
                <Select
                  value={editedData.buyer_type || ''}
                  onValueChange={(value) => setEditedData(prev => ({ ...prev, buyer_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select buyer type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  value={editedData.budget || ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, budget: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="lead_score">Lead Score (1-10)</Label>
                <Input
                  id="lead_score"
                  type="number"
                  min="1"
                  max="10"
                  value={editedData.lead_score || ''}
                  onChange={(e) => setEditedData(prev => ({ ...prev, lead_score: parseInt(e.target.value) || null }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedInteraction(null)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdateExtraction(selectedInteraction)}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface ChatInteractionCardProps {
  interaction: ChatInteraction;
  onApprove?: () => void;
  onEdit?: () => void;
  showActions: boolean;
}

const ChatInteractionCard: React.FC<ChatInteractionCardProps> = ({
  interaction,
  onApprove,
  onEdit,
  showActions
}) => {
  const data = interaction.captured_data || {};
  const scores = interaction.confidence_scores || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {interaction.subject}
              {interaction.extraction_reviewed && (
                <Badge variant="outline" className="bg-green-50">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {interaction.page_source && (
                <Badge variant="secondary" className="mr-2">
                  <MapPin className="h-3 w-3 mr-1" />
                  {interaction.page_source}
                </Badge>
              )}
              {new Date(interaction.completed_at).toLocaleString()}
            </CardDescription>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit
              </Button>
              <Button size="sm" onClick={onApprove}>
                Approve
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Info */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h4>
            {interaction.leads && (
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {interaction.leads.first_name} {interaction.leads.last_name}</p>
                <p><strong>Email:</strong> {interaction.leads.email}</p>
                <p><strong>Phone:</strong> {interaction.leads.phone}</p>
                <p><strong>Status:</strong> <Badge variant="outline">{interaction.leads.status}</Badge></p>
              </div>
            )}
          </div>

          {/* Extracted Data */}
          <div className="space-y-2">
            <h4 className="font-semibold">Extracted Data</h4>
            <div className="space-y-1 text-sm">
              {data.beds && (
                <div className="flex items-center justify-between">
                  <span>Bedrooms: {data.beds}</span>
                  {scores.beds && (
                    <Badge variant="outline" className={`text-white ${scores.beds >= 0.8 ? 'bg-green-500' : scores.beds >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {Math.round(scores.beds * 100)}%
                    </Badge>
                  )}
                </div>
              )}
              {data.baths && (
                <div className="flex items-center justify-between">
                  <span>Bathrooms: {data.baths}</span>
                  {scores.baths && (
                    <Badge variant="outline" className={`text-white ${scores.baths >= 0.8 ? 'bg-green-500' : scores.baths >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {Math.round(scores.baths * 100)}%
                    </Badge>
                  )}
                </div>
              )}
              {data.timeframe && (
                <div className="flex items-center justify-between">
                  <span>Timeframe: {data.timeframe}</span>
                  {scores.timeframe && (
                    <Badge variant="outline" className={`text-white ${scores.timeframe >= 0.8 ? 'bg-green-500' : scores.timeframe >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {Math.round(scores.timeframe * 100)}%
                    </Badge>
                  )}
                </div>
              )}
              {data.buyer_type && (
                <div className="flex items-center justify-between">
                  <span>Type: {data.buyer_type}</span>
                  {scores.buyer_type && (
                    <Badge variant="outline" className={`text-white ${scores.buyer_type >= 0.8 ? 'bg-green-500' : scores.buyer_type >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {Math.round(scores.buyer_type * 100)}%
                    </Badge>
                  )}
                </div>
              )}
              {data.budget && (
                <div className="flex items-center justify-between">
                  <span>Budget: {data.budget}</span>
                  {scores.budget && (
                    <Badge variant="outline" className={`text-white ${scores.budget >= 0.8 ? 'bg-green-500' : scores.budget >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {Math.round(scores.budget * 100)}%
                    </Badge>
                  )}
                </div>
              )}
              {data.lead_score && (
                <div className="flex items-center justify-between">
                  <span>Lead Score: {data.lead_score}/10</span>
                  {scores.lead_score && (
                    <Badge variant="outline" className={`text-white ${scores.lead_score >= 0.8 ? 'bg-green-500' : scores.lead_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {Math.round(scores.lead_score * 100)}%
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat Transcript */}
        <div className="mt-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                View Chat Transcript
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Chat Transcript</DialogTitle>
                <DialogDescription>
                  Complete conversation transcript
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="h-[400px] w-full rounded border p-4">
                <pre className="whitespace-pre-wrap text-sm">{interaction.chat_transcript}</pre>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};