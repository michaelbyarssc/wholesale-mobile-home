import React, { useState } from 'react';
import { MessageSquare, Phone, Mail, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChatWidget } from './ChatWidget';
import { useChatSupport } from '@/hooks/useChatSupport';

interface ChatInterfaceProps {
  userId?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ userId }) => {
  const [selectedDepartment, setSelectedDepartment] = useState('general');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState('medium');
  
  const { createSupportTicket, initializeChat } = useChatSupport(userId);

  const handleCreateTicket = async () => {
    if (!ticketTitle.trim() || !ticketDescription.trim()) return;
    
    await createSupportTicket(ticketTitle, ticketDescription, selectedDepartment, ticketPriority);
    
    // Reset form
    setTicketTitle('');
    setTicketDescription('');
    setTicketPriority('medium');
  };

  const handleStartChat = async (department: string = 'general') => {
    setSelectedDepartment(department);
    // The ChatWidget will handle the anonymous user flow
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Get Support</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          We're here to help! Choose how you'd like to get assistance with your mobile home needs.
        </p>
      </div>

      {/* Support Options */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleStartChat('sales')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Live Chat
            </CardTitle>
            <CardDescription>
              Instant help from our support team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get real-time assistance with your questions about inventory, pricing, and ordering.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              <span>3 agents online</span>
              <Badge variant="secondary" className="ml-auto">
                <Clock className="h-3 w-3 mr-1" />
                ~2 min wait
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Call Us
            </CardTitle>
            <CardDescription>
              Speak directly with our experts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Call our toll-free number for personalized assistance with your mobile home search.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-lg">1-800-555-HOMES</p>
              <p className="text-sm text-muted-foreground">
                Mon-Fri 8AM-8PM EST<br />
                Sat-Sun 9AM-5PM EST
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Support
            </CardTitle>
            <CardDescription>
              Send us your detailed questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              For complex inquiries or when you need to attach documents and images.
            </p>
            <div className="space-y-2">
              <p className="font-medium">support@mobilehomes.com</p>
              <Badge variant="outline">
                Response within 4 hours
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department-specific Support */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Department</CardTitle>
          <CardDescription>
            Get connected with the right specialist for your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { id: 'sales', name: 'Sales', desc: 'Inventory, pricing, purchasing' },
              { id: 'financing', name: 'Financing', desc: 'Loans, payments, credit' },
              { id: 'delivery', name: 'Delivery', desc: 'Shipping, installation, setup' },
              { id: 'support', name: 'Technical', desc: 'Website, account, technical issues' }
            ].map((dept) => (
              <Button
                key={dept.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start text-left"
                onClick={() => handleStartChat(dept.id)}
              >
                <span className="font-medium">{dept.name}</span>
                <span className="text-xs text-muted-foreground mt-1">{dept.desc}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Support Ticket */}
      <Card>
        <CardHeader>
          <CardTitle>Create Support Ticket</CardTitle>
          <CardDescription>
            For complex issues that need detailed investigation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="ticket-title" className="text-sm font-medium">
                Subject
              </label>
              <Input
                id="ticket-title"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="Brief description of your issue"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ticket-priority" className="text-sm font-medium">
                Priority
              </label>
              <Select value={ticketPriority} onValueChange={setTicketPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="ticket-description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="ticket-description"
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value)}
              placeholder="Please provide detailed information about your issue..."
              rows={4}
            />
          </div>

          <Button 
            onClick={handleCreateTicket}
            disabled={!userId || !ticketTitle.trim() || !ticketDescription.trim()}
            className="w-full md:w-auto"
          >
            Create Support Ticket
          </Button>
          
          {!userId && (
            <p className="text-sm text-muted-foreground">
              Please sign in to create support tickets
            </p>
          )}
        </CardContent>
      </Card>

      {/* Chat Widget */}
      <ChatWidget userId={userId} />
    </div>
  );
};