'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useEffectiveUser } from '@/hooks/use-effective-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle, Phone, Mail, User, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

interface FollowUp {
  id: string;
  appointment_id: string;
  scheduled_for: string;
  completed_at?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'overdue';
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  call_outcome?: string;
  show_outcome?: string;
  pitched?: boolean;
  watched_assets?: boolean;
  cash_collected?: number;
  total_sales_value?: number;
  lead_quality?: number;
  objections?: any;
  notes?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  original_appointment_date?: string;
  original_setter?: string;
  original_sales_rep?: string;
  original_show_outcome?: string;
  account_name?: string;
}

interface Notification {
  id: string;
  follow_up_id: string;
  notification_type: string;
  scheduled_for: string;
  sent_at?: string;
  acknowledged_at?: string;
  delivery_status: string;
  title: string;
  message: string;
}

export default function FollowUpsPage() {
  const { user, account, selectedAccount } = useEffectiveUser();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for completing follow-up
  const [completeForm, setCompleteForm] = useState({
    call_outcome: '',
    show_outcome: '',
    pitched: false,
    watched_assets: false,
    cash_collected: 0,
    total_sales_value: 0,
    lead_quality: 3,
    objections: [],
    notes: '',
    schedule_next_follow_up: false,
    next_follow_up_date: new Date()
  });

  useEffect(() => {
    if (selectedAccount) {
      loadFollowUps();
      loadNotifications();
      // Check for overdue follow-ups
      checkOverdueFollowUps();
    }
  }, [selectedAccount, filter]);

  const loadFollowUps = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      let query = supabase
        .from('follow_up_dashboard')
        .select('*')
        .eq('account_id', selectedAccount.id)
        .order('scheduled_for', { ascending: true });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFollowUps(data || []);
    } catch (error) {
      console.error('Error loading follow-ups:', error);
      toast({
        title: 'Error',
        description: 'Failed to load follow-ups',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('follow_up_notifications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('delivery_status', 'pending')
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const checkOverdueFollowUps = async () => {
    try {
      const supabase = createClient();
      await supabase.rpc('mark_overdue_follow_ups');
    } catch (error) {
      console.error('Error checking overdue follow-ups:', error);
    }
  };

  const handleCompleteFollowUp = async () => {
    if (!selectedFollowUp) return;

    try {
      const supabase = createClient();
      
      // Update the follow-up
      const { error: updateError } = await supabase
        .from('follow_ups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          ...completeForm,
          objections: JSON.stringify(completeForm.objections)
        })
        .eq('id', selectedFollowUp.id);

      if (updateError) throw updateError;

      // If scheduling next follow-up
      if (completeForm.schedule_next_follow_up && completeForm.show_outcome === 'follow up') {
        const { error: createError } = await supabase
          .from('follow_ups')
          .insert({
            appointment_id: selectedFollowUp.appointment_id,
            parent_follow_up_id: selectedFollowUp.id,
            account_id: selectedAccount.id,
            scheduled_for: completeForm.next_follow_up_date.toISOString(),
            assigned_to_user_id: selectedFollowUp.assigned_to_user_id,
            assigned_to_name: selectedFollowUp.assigned_to_name,
            status: 'pending'
          });

        if (createError) throw createError;

        // Create notification for next follow-up
        const { error: notifError } = await supabase
          .from('follow_up_notifications')
          .insert({
            follow_up_id: selectedFollowUp.id,
            user_id: selectedFollowUp.assigned_to_user_id,
            account_id: selectedAccount.id,
            notification_type: 'reminder',
            scheduled_for: completeForm.next_follow_up_date.toISOString(),
            title: 'Follow-up Reminder',
            message: `Follow-up scheduled with ${selectedFollowUp.contact_name}`,
            action_url: `/follow-ups`
          });

        if (notifError) console.error('Error creating notification:', notifError);
      }

      toast({
        title: 'Success',
        description: 'Follow-up completed successfully'
      });

      setCompleteDialogOpen(false);
      setSelectedFollowUp(null);
      loadFollowUps();
    } catch (error) {
      console.error('Error completing follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete follow-up',
        variant: 'destructive'
      });
    }
  };

  const handleRescheduleFollowUp = async (newDate: Date) => {
    if (!selectedFollowUp) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('follow_ups')
        .update({
          scheduled_for: newDate.toISOString(),
          status: 'pending'
        })
        .eq('id', selectedFollowUp.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Follow-up rescheduled successfully'
      });

      setRescheduleDialogOpen(false);
      setSelectedFollowUp(null);
      loadFollowUps();
    } catch (error) {
      console.error('Error rescheduling follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to reschedule follow-up',
        variant: 'destructive'
      });
    }
  };

  const handleCancelFollowUp = async (followUp: FollowUp) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('follow_ups')
        .update({ status: 'cancelled' })
        .eq('id', followUp.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Follow-up cancelled'
      });

      loadFollowUps();
    } catch (error) {
      console.error('Error cancelling follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel follow-up',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDateLabel = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isPast(d)) return formatDistanceToNow(d, { addSuffix: true });
    return format(d, 'MMM d, yyyy');
  };

  const filteredFollowUps = followUps.filter(fu => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        fu.contact_name?.toLowerCase().includes(search) ||
        fu.contact_email?.toLowerCase().includes(search) ||
        fu.contact_phone?.includes(search) ||
        fu.assigned_to_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Follow-ups</h1>
        <Button onClick={() => loadFollowUps()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg">Pending Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notifications.map(notif => (
                <div key={notif.id} className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <p className="font-medium">{notif.title}</p>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                  </div>
                  <Badge variant="outline">{getDateLabel(notif.scheduled_for)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by contact name, email, phone, or assigned user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Original Appointment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading follow-ups...
                  </TableCell>
                </TableRow>
              ) : filteredFollowUps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No follow-ups found
                  </TableCell>
                </TableRow>
              ) : (
                filteredFollowUps.map((followUp) => (
                  <TableRow key={followUp.id}>
                    <TableCell>{getStatusBadge(followUp.status)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{getDateLabel(followUp.scheduled_for)}</p>
                        <p className="text-sm text-gray-500">{format(new Date(followUp.scheduled_for), 'h:mm a')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{followUp.contact_name || 'Unknown'}</p>
                        <div className="flex gap-2 mt-1">
                          {followUp.contact_email && (
                            <a href={`mailto:${followUp.contact_email}`} className="text-blue-600 hover:underline">
                              <Mail className="w-4 h-4" />
                            </a>
                          )}
                          {followUp.contact_phone && (
                            <a href={`tel:${followUp.contact_phone}`} className="text-blue-600 hover:underline">
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4 text-gray-400" />
                        {followUp.assigned_to_name || 'Unassigned'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(followUp.original_appointment_date || ''), 'MMM d, yyyy')}</p>
                        <p className="text-gray-500">Outcome: {followUp.original_show_outcome}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {followUp.status === 'pending' || followUp.status === 'overdue' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFollowUp(followUp);
                                setCompleteDialogOpen(true);
                              }}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFollowUp(followUp);
                                setRescheduleDialogOpen(true);
                              }}
                            >
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelFollowUp(followUp)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Badge variant="secondary">
                            {followUp.status === 'completed' ? followUp.show_outcome : followUp.status}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Complete Follow-up Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Follow-up</DialogTitle>
            <DialogDescription>
              Record the outcome of your follow-up with {selectedFollowUp?.contact_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Call Outcome</Label>
                <Select
                  value={completeForm.call_outcome}
                  onValueChange={(v) => setCompleteForm({ ...completeForm, call_outcome: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Show">Show</SelectItem>
                    <SelectItem value="No Show">No Show</SelectItem>
                    <SelectItem value="Reschedule">Reschedule</SelectItem>
                    <SelectItem value="Cancel">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Show Outcome</Label>
                <Select
                  value={completeForm.show_outcome}
                  onValueChange={(v) => setCompleteForm({ ...completeForm, show_outcome: v })}
                  disabled={completeForm.call_outcome !== 'Show'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="follow up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {completeForm.call_outcome === 'Show' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="pitched"
                      checked={completeForm.pitched}
                      onChange={(e) => setCompleteForm({ ...completeForm, pitched: e.target.checked })}
                    />
                    <Label htmlFor="pitched">Pitched</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="watched_assets"
                      checked={completeForm.watched_assets}
                      onChange={(e) => setCompleteForm({ ...completeForm, watched_assets: e.target.checked })}
                    />
                    <Label htmlFor="watched_assets">Watched Assets</Label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cash Collected</Label>
                    <Input
                      type="number"
                      value={completeForm.cash_collected}
                      onChange={(e) => setCompleteForm({ ...completeForm, cash_collected: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Total Sales Value</Label>
                    <Input
                      type="number"
                      value={completeForm.total_sales_value}
                      onChange={(e) => setCompleteForm({ ...completeForm, total_sales_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Lead Quality (1-5)</Label>
                  <Select
                    value={completeForm.lead_quality.toString()}
                    onValueChange={(v) => setCompleteForm({ ...completeForm, lead_quality: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Poor</SelectItem>
                      <SelectItem value="2">2 - Fair</SelectItem>
                      <SelectItem value="3">3 - Good</SelectItem>
                      <SelectItem value="4">4 - Very Good</SelectItem>
                      <SelectItem value="5">5 - Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({ ...completeForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            {completeForm.show_outcome === 'follow up' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="schedule_next"
                    checked={completeForm.schedule_next_follow_up}
                    onChange={(e) => setCompleteForm({ ...completeForm, schedule_next_follow_up: e.target.checked })}
                  />
                  <Label htmlFor="schedule_next">Schedule Next Follow-up</Label>
                </div>
                
                {completeForm.schedule_next_follow_up && (
                  <div>
                    <Label>Next Follow-up Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(completeForm.next_follow_up_date, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={completeForm.next_follow_up_date}
                          onSelect={(date) => date && setCompleteForm({ ...completeForm, next_follow_up_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteFollowUp}>
              Complete Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Follow-up</DialogTitle>
            <DialogDescription>
              Select a new date and time for the follow-up with {selectedFollowUp?.contact_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Calendar
              mode="single"
              selected={selectedFollowUp ? new Date(selectedFollowUp.scheduled_for) : undefined}
              onSelect={(date) => date && handleRescheduleFollowUp(date)}
              initialFocus
              disabled={(date) => isPast(date) && !isToday(date)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 