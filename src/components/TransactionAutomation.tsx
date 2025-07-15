import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Zap, 
  Clock, 
  Bell, 
  Mail, 
  MessageSquare, 
  CheckCircle,
  AlertCircle,
  Settings,
  Plus,
  Play,
  Pause,
  Edit
} from 'lucide-react';
import { TransactionStatus } from '@/types/transaction';

interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    type: 'status_change' | 'time_based' | 'amount_threshold';
    value: string;
    condition?: string;
  };
  action: {
    type: 'email' | 'notification' | 'status_change' | 'task_creation';
    value: string;
    template?: string;
  };
  active: boolean;
  conditions?: string[];
  lastExecuted?: Date;
  executionCount: number;
}

interface TransactionAutomationProps {
  className?: string;
}

export function TransactionAutomation({ className }: TransactionAutomationProps) {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: '1',
      name: 'Payment Overdue Alert',
      trigger: { type: 'time_based', value: '7_days_after_invoice' },
      action: { type: 'email', value: 'payment_reminder', template: 'payment_overdue' },
      active: true,
      executionCount: 23
    },
    {
      id: '2',
      name: 'Estimate Follow-up',
      trigger: { type: 'time_based', value: '3_days_after_estimate' },
      action: { type: 'email', value: 'estimate_followup', template: 'estimate_reminder' },
      active: true,
      executionCount: 12
    },
    {
      id: '3',
      name: 'High Value Transaction Alert',
      trigger: { type: 'amount_threshold', value: '50000' },
      action: { type: 'notification', value: 'admin_notification' },
      active: true,
      executionCount: 8
    },
    {
      id: '4',
      name: 'Auto-approve Small Transactions',
      trigger: { type: 'amount_threshold', value: '1000', condition: 'less_than' },
      action: { type: 'status_change', value: 'estimate_approved' },
      active: false,
      executionCount: 0
    }
  ]);

  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: '',
    trigger: { type: 'status_change', value: '' },
    action: { type: 'email', value: '' },
    active: true,
    executionCount: 0
  });

  const toggleRule = (ruleId: string) => {
    setAutomationRules(prev => 
      prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, active: !rule.active }
          : rule
      )
    );
  };

  const getTriggerDisplay = (trigger: AutomationRule['trigger']) => {
    switch (trigger.type) {
      case 'status_change':
        return `When status changes to ${trigger.value}`;
      case 'time_based':
        return `${trigger.value.replace('_', ' ')}`;
      case 'amount_threshold':
        return `When amount ${trigger.condition || 'exceeds'} $${trigger.value}`;
      default:
        return trigger.value;
    }
  };

  const getActionDisplay = (action: AutomationRule['action']) => {
    switch (action.type) {
      case 'email':
        return `Send email: ${action.template || action.value}`;
      case 'notification':
        return `Send notification: ${action.value}`;
      case 'status_change':
        return `Change status to: ${action.value}`;
      case 'task_creation':
        return `Create task: ${action.value}`;
      default:
        return action.value;
    }
  };

  const handleSaveRule = () => {
    if (selectedRule) {
      // Update existing rule
      setAutomationRules(prev => 
        prev.map(rule => 
          rule.id === selectedRule.id 
            ? { ...rule, ...newRule }
            : rule
        )
      );
    } else {
      // Create new rule
      const rule: AutomationRule = {
        id: Date.now().toString(),
        name: newRule.name || 'Untitled Rule',
        trigger: newRule.trigger || { type: 'status_change', value: '' },
        action: newRule.action || { type: 'email', value: '' },
        active: newRule.active || true,
        executionCount: 0
      };
      setAutomationRules(prev => [...prev, rule]);
    }
    
    setIsDialogOpen(false);
    setSelectedRule(null);
    setNewRule({
      name: '',
      trigger: { type: 'status_change', value: '' },
      action: { type: 'email', value: '' },
      active: true,
      executionCount: 0
    });
  };

  const openEditDialog = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setNewRule(rule);
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setSelectedRule(null);
    setNewRule({
      name: '',
      trigger: { type: 'status_change', value: '' },
      action: { type: 'email', value: '' },
      active: true,
      executionCount: 0
    });
    setIsDialogOpen(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            Transaction Automation
          </h2>
          <p className="text-gray-600">Automate your transaction workflows and notifications</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rules</p>
                <p className="text-xl font-bold">{automationRules.filter(r => r.active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Executions</p>
                <p className="text-xl font-bold">{automationRules.reduce((sum, r) => sum + r.executionCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Email Rules</p>
                <p className="text-xl font-bold">{automationRules.filter(r => r.action.type === 'email').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Notification Rules</p>
                <p className="text-xl font-bold">{automationRules.filter(r => r.action.type === 'notification').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {automationRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={rule.active} 
                      onCheckedChange={() => toggleRule(rule.id)}
                    />
                    {rule.active ? (
                      <Play className="h-4 w-4 text-green-600" />
                    ) : (
                      <Pause className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{rule.name}</h3>
                    <p className="text-sm text-gray-600">{getTriggerDisplay(rule.trigger)}</p>
                    <p className="text-sm text-gray-500">→ {getActionDisplay(rule.action)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {rule.executionCount} executions
                    </p>
                    {rule.lastExecuted && (
                      <p className="text-xs text-gray-500">
                        Last: {rule.lastExecuted.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge variant={rule.active ? "default" : "secondary"}>
                    {rule.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openEditDialog(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rule Creation/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? 'Edit Automation Rule' : 'Create New Automation Rule'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ruleName">Rule Name</Label>
              <Input
                id="ruleName"
                value={newRule.name}
                onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter rule name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="triggerType">Trigger Type</Label>
                <Select 
                  value={newRule.trigger?.type} 
                  onValueChange={(value) => setNewRule(prev => ({ 
                    ...prev, 
                    trigger: { ...prev.trigger!, type: value as any }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status_change">Status Change</SelectItem>
                    <SelectItem value="time_based">Time Based</SelectItem>
                    <SelectItem value="amount_threshold">Amount Threshold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="triggerValue">Trigger Value</Label>
                <Input
                  id="triggerValue"
                  value={newRule.trigger?.value}
                  onChange={(e) => setNewRule(prev => ({ 
                    ...prev, 
                    trigger: { ...prev.trigger!, value: e.target.value }
                  }))}
                  placeholder="Enter trigger value"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="actionType">Action Type</Label>
                <Select 
                  value={newRule.action?.type} 
                  onValueChange={(value) => setNewRule(prev => ({ 
                    ...prev, 
                    action: { ...prev.action!, type: value as any }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Send Email</SelectItem>
                    <SelectItem value="notification">Send Notification</SelectItem>
                    <SelectItem value="status_change">Change Status</SelectItem>
                    <SelectItem value="task_creation">Create Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="actionValue">Action Value</Label>
                <Input
                  id="actionValue"
                  value={newRule.action?.value}
                  onChange={(e) => setNewRule(prev => ({ 
                    ...prev, 
                    action: { ...prev.action!, value: e.target.value }
                  }))}
                  placeholder="Enter action value"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                checked={newRule.active} 
                onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, active: checked }))}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRule}>
                {selectedRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}