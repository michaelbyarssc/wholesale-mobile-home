import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Phone, 
  User, 
  Calendar,
  Search,
  Eye,
  Clock,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AnonymousChatUser {
  id: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  updated_at: string;
  chat_sessions: {
    id: string;
    status: string;
    subject: string;
    department: string;
    started_at: string;
    ended_at?: string;
    agent_id?: string;
    chat_messages: Array<{
      id: string;
      content: string;
      sender_type: string;
      created_at: string;
    }>;
  };
}

export const AnonymousChatUsers = () => {
  const { toast } = useToast();
  const [anonymousUsers, setAnonymousUsers] = useState<AnonymousChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AnonymousChatUser | null>(null);

  const fetchAnonymousUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('anonymous_chat_users')
        .select(`
          *,
          chat_sessions!inner (
            id,
            status,
            subject,
            department,
            started_at,
            ended_at,
            agent_id,
            chat_messages (
              id,
              content,
              sender_type,
              created_at
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAnonymousUsers(data || []);
    } catch (error) {
      console.error('Error fetching anonymous chat users:', error);
      toast({
        title: "Error",
        description: "Failed to load anonymous chat users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnonymousUsers();
  }, []);

  const filteredUsers = anonymousUsers.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.customer_phone.includes(searchTerm) ||
      user.chat_sessions.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-500 text-white',
      ended: 'bg-gray-500 text-white',
      waiting: 'bg-yellow-500 text-white'
    };
    
    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500 text-white'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDepartmentBadge = (department: string) => {
    const colors = {
      sales: 'bg-blue-500 text-white',
      support: 'bg-purple-500 text-white',
      technical: 'bg-orange-500 text-white',
      general: 'bg-gray-500 text-white'
    };
    
    return (
      <Badge variant="outline" className={colors[department as keyof typeof colors]}>
        {department.charAt(0).toUpperCase() + department.slice(1)}
      </Badge>
    );
  };

  const getTotalMessages = (messages: any[]) => {
    return messages.filter(m => m.sender_type === 'user').length;
  };

  const getLastMessage = (messages: any[]) => {
    if (messages.length === 0) return null;
    const sortedMessages = messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return sortedMessages[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading anonymous chat users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Anonymous Chat Users</h2>
          <p className="text-muted-foreground">Manage chat sessions from anonymous users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anonymous Chats</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anonymousUsers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anonymousUsers.filter(u => u.chat_sessions.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Chats</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {anonymousUsers.filter(u => 
                new Date(u.created_at).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => {
          const lastMessage = getLastMessage(user.chat_sessions.chat_messages);
          const totalMessages = getTotalMessages(user.chat_sessions.chat_messages);
          
          return (
            <Card key={user.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {user.customer_name}
                      </h3>
                      {getStatusBadge(user.chat_sessions.status)}
                      {getDepartmentBadge(user.chat_sessions.department)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.customer_phone}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {totalMessages} messages
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Started {format(new Date(user.chat_sessions.started_at), 'MMM d, h:mm a')}
                      </div>
                      {user.chat_sessions.ended_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Ended {format(new Date(user.chat_sessions.ended_at), 'MMM d, h:mm a')}
                        </div>
                      )}
                    </div>

                    <div className="text-sm">
                      <span className="font-medium">Subject:</span> {user.chat_sessions.subject}
                    </div>

                    {lastMessage && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <span className="font-medium">Last message:</span>
                        <p className="text-muted-foreground truncate">
                          {lastMessage.content}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(lastMessage.created_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedUser(user)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No anonymous chat users found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : 'Anonymous chat users will appear here when they start conversations.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* TODO: Add user detail modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Chat Details: {selectedUser.customer_name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {selectedUser.customer_name}
                </div>
                <div>
                  <span className="font-medium">Phone:</span> {selectedUser.customer_phone}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {getStatusBadge(selectedUser.chat_sessions.status)}
                </div>
                <div>
                  <span className="font-medium">Department:</span> {getDepartmentBadge(selectedUser.chat_sessions.department)}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Chat Messages:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedUser.chat_sessions.chat_messages.map((message) => (
                    <div key={message.id} className={`p-2 rounded text-sm ${
                      message.sender_type === 'user' ? 'bg-blue-100 ml-4' : 'bg-gray-100 mr-4'
                    }`}>
                      <div className="font-medium text-xs mb-1">
                        {message.sender_type === 'user' ? selectedUser.customer_name : 'Support'}
                      </div>
                      <div>{message.content}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(message.created_at), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};