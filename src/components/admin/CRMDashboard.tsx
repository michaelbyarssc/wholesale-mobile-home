import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  CalendarIcon,
  Plus, 
  Phone, 
  Mail, 
  MessageSquare, 
  User, 
  Clock,
  Star,
  TrendingUp,
  Users,
  Target,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarLucide,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LeadForm } from './crm/LeadForm';
import { InteractionForm } from './crm/InteractionForm';
import { FollowUpForm } from './crm/FollowUpForm';
import { AnonymousChatUsers } from './AnonymousChatUsers';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company?: string;
  status: string;
  lead_score: number;
  estimated_budget?: number;
  estimated_timeline?: string;
  interests: any; // JSONB can be array or string
  notes?: string;
  assigned_to?: string;
  last_contacted_at?: string;
  next_follow_up_at?: string;
  created_at: string;
  lead_sources?: { name: string };
}

interface Interaction {
  id: string;
  interaction_type: string;
  subject: string;
  description?: string;
  outcome?: string;
  completed_at?: string;
  created_at: string;
}

interface FollowUp {
  id: string;
  title: string;
  description?: string;
  follow_up_type: string;
  priority: string;
  due_date: string;
  completed: boolean;
  leads?: { first_name: string; last_name: string };
}

export const CRMDashboard = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadDialog, setShowLeadDialog] = useState(false);
  const [showInteractionDialog, setShowInteractionDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const leadStatuses = [
    { value: 'new', label: 'New', color: 'bg-blue-500' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
    { value: 'qualified', label: 'Qualified', color: 'bg-green-500' },
    { value: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
    { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
    { value: 'closed_won', label: 'Closed Won', color: 'bg-emerald-500' },
    { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-500' },
    { value: 'nurturing', label: 'Nurturing', color: 'bg-indigo-500' }
  ];

  const priorityColors = {
    low: 'bg-gray-500',
    medium: 'bg-blue-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch leads with lead sources
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          lead_sources(name)
        `)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch recent interactions
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('customer_interactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (interactionsError) throw interactionsError;

      // Fetch upcoming follow-ups
      const { data: followUpsData, error: followUpsError } = await supabase
        .from('follow_ups')
        .select(`
          *,
          leads(first_name, last_name)
        `)
        .eq('completed', false)
        .order('due_date', { ascending: true });

      if (followUpsError) throw followUpsError;

      // Fetch lead sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('lead_sources')
        .select('*')
        .eq('active', true)
        .order('name');

      if (sourcesError) throw sourcesError;

      setLeads(leadsData || []);
      setInteractions(interactionsData || []);
      setFollowUps(followUpsData || []);
      setLeadSources(sourcesData || []);

    } catch (error) {
      console.error('Error fetching CRM data:', error);
      toast({
        title: "Error",
        description: "Failed to load CRM data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = leadStatuses.find(s => s.value === status);
    return statusConfig ? (
      <Badge className={`${statusConfig.color} text-white`}>
        {statusConfig.label}
      </Badge>
    ) : <Badge variant="secondary">{status}</Badge>;
  };

  const getLeadScore = (score: number) => {
    if (score >= 80) return <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />;
    if (score >= 60) return <Star className="h-4 w-4 text-yellow-500" />;
    return <Star className="h-4 w-4 text-gray-300" />;
  };

  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const stats = {
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'new').length,
    qualifiedLeads: leads.filter(l => l.status === 'qualified').length,
    conversionRate: leads.length > 0 ? 
      ((leads.filter(l => l.status === 'closed_won').length / leads.length) * 100).toFixed(1) 
      : '0'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading CRM data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Dashboard</h1>
          <p className="text-muted-foreground">Manage leads and customer interactions</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showLeadDialog} onOpenChange={setShowLeadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <LeadForm 
                leadSources={leadSources}
                onSave={() => {
                  setShowLeadDialog(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualifiedLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="interactions">Recent Interactions</TabsTrigger>
          <TabsTrigger value="follow-ups">Follow-ups</TabsTrigger>
          <TabsTrigger value="anonymous-chats">Anonymous Chats</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {leadStatuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Leads List */}
          <div className="grid gap-4">
            {filteredLeads.map((lead) => (
              <Card key={lead.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {lead.first_name} {lead.last_name}
                        </h3>
                        {getStatusBadge(lead.status)}
                        {getLeadScore(lead.lead_score)}
                        <span className="text-sm text-muted-foreground">
                          Score: {lead.lead_score}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                        )}
                        {lead.company && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {lead.company}
                          </div>
                        )}
                      </div>

                      {lead.estimated_budget && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Est. Budget:</span> ${lead.estimated_budget.toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Recent Interactions</h3>
            <Dialog open={showInteractionDialog} onOpenChange={setShowInteractionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Log Interaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log New Interaction</DialogTitle>
                </DialogHeader>
                <InteractionForm 
                  leads={leads}
                  onSave={() => {
                    setShowInteractionDialog(false);
                    fetchData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {interactions.map((interaction) => (
              <Card key={interaction.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{interaction.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {interaction.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="capitalize">{interaction.interaction_type}</span>
                        <span>{format(new Date(interaction.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {interaction.interaction_type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="follow-ups" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Upcoming Follow-ups</h3>
            <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                </DialogHeader>
                <FollowUpForm 
                  leads={leads}
                  onSave={() => {
                    setShowFollowUpDialog(false);
                    fetchData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {followUps.map((followUp) => (
              <Card key={followUp.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{followUp.title}</h4>
                        <Badge 
                          className={`${priorityColors[followUp.priority as keyof typeof priorityColors]} text-white text-xs`}
                        >
                          {followUp.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {followUp.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalendarLucide className="h-3 w-3" />
                          {format(new Date(followUp.due_date), 'MMM d, yyyy h:mm a')}
                        </div>
                        {followUp.leads && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {followUp.leads.first_name} {followUp.leads.last_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Mark Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="anonymous-chats" className="space-y-4">
          <AnonymousChatUsers />
        </TabsContent>

        <TabsContent value="pipeline" className="space-y-4">
          <PipelineView leads={leads} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const PipelineView = ({ leads }: { leads: Lead[] }) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {[
        { status: 'new', label: 'New Leads' },
        { status: 'qualified', label: 'Qualified' },
        { status: 'proposal', label: 'Proposal' },
        { status: 'closed_won', label: 'Closed Won' }
      ].map(column => (
        <Card key={column.status}>
          <CardHeader>
            <CardTitle className="text-sm">{column.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leads
                .filter(lead => lead.status === column.status)
                .map(lead => (
                  <div key={lead.id} className="p-2 bg-muted rounded text-sm">
                    {lead.first_name} {lead.last_name}
                    {lead.estimated_budget && (
                      <div className="text-xs text-muted-foreground">
                        ${lead.estimated_budget.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};