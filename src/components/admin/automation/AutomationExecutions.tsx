import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Mail, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Pause } from "lucide-react";
import { format } from "date-fns";

interface AutomationExecution {
  id: string;
  automation_template: {
    name: string;
  };
  customer_email: string;
  customer_phone: string;
  scheduled_for: string;
  executed_at: string;
  status: string;
  error_message: string;
  message_content: string;
  message_subject: string;
}

interface AutomationExecutionsProps {
  executions: AutomationExecution[];
  onRefresh: () => void;
}

export function AutomationExecutions({ executions, onRefresh }: AutomationExecutionsProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredExecutions = executions.filter(execution => 
    statusFilter === 'all' || execution.status === statusFilter
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'executing':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'secondary';
      case 'executing':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      case 'paused':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getMessageTypeIcon = (content: string, subject: string) => {
    return subject ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Automation Execution History</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="executing">Executing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No automation executions found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Executed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExecutions.map((execution) => (
                <TableRow key={execution.id}>
                  <TableCell className="font-medium">
                    {execution.automation_template?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {execution.customer_email && (
                        <div className="text-sm">{execution.customer_email}</div>
                      )}
                      {execution.customer_phone && (
                        <div className="text-sm text-muted-foreground">
                          {execution.customer_phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {getMessageTypeIcon(execution.message_content, execution.message_subject)}
                      <span className="text-sm">
                        {execution.message_subject ? 'Email' : 'SMS'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(execution.scheduled_for), 'MMM d, yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(execution.scheduled_for), 'h:mm a')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {execution.executed_at ? (
                      <div>
                        <div className="text-sm">
                          {format(new Date(execution.executed_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(execution.executed_at), 'h:mm a')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getStatusVariant(execution.status)}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getStatusIcon(execution.status)}
                      <span className="capitalize">{execution.status}</span>
                    </Badge>
                    {execution.error_message && (
                      <div className="text-xs text-red-500 mt-1 max-w-40 truncate">
                        {execution.error_message}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}