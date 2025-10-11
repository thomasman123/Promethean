'use client';

import { useState, useEffect } from 'react';
import { LayoutWrapper } from '@/components/layout/layout-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useImpersonation } from '@/hooks/use-impersonation';
import { useEffectiveUser } from '@/hooks/use-effective-user';
import { supabase } from '@/lib/supabase';
import { useDashboard } from '@/lib/dashboard-context';
import { CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle, Phone, Mail, User, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns';
import { useAccountTimezone } from '@/hooks/use-account-timezone';
import { Loading } from '@/components/ui/loading';

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

function FollowUpsContent() {
  const { user } = useEffectiveUser();
  const { isImpersonating } = useImpersonation();
  const { selectedAccountId } = useDashboard();
  const { toast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Use account timezone for all date formatting
  const { formatDate: formatDateInTz, getDateLabel: getDateLabelInTz, isToday: isTodayInTz, isTomorrow: isTomorrowInTz, isPast: isPastInTz } = useAccountTimezone(selectedAccountId);

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
    if (selectedAccountId && user) {
      loadFollowUps();
      // Check for overdue follow-ups
      checkOverdueFollowUps();
    }
  }, [selectedAccountId, statusFilter, user]);

  const loadFollowUps = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('follow_up_dashboard')
        .select('*')
        .eq('assigned_to_user_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
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

  const checkOverdueFollowUps = async () => {
    try {
      await supabase.rpc('mark_overdue_follow_ups');
    } catch (error) {
      console.error('Error checking overdue follow-ups:', error);
    }
  };

  const handleCompleteFollowUp = async () => {
    if (!selectedFollowUp) return;

    try {
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
            account_id: selectedAccountId,
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
            account_id: selectedAccountId,
            notification_type: 'reminder',
            scheduled_for: completeForm.next_follow_up_date.toISOString(),
            title: 'Follow-up Reminder',
            message: `Follow-up scheduled with ${selectedFollowUp.contact_name}`,
            action_url: `/update-data/follow-ups`
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
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'completed':
        return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDateLabel = (date: string) => {
    // Use timezone-aware date formatting if timezone is loaded
    if (selectedAccountId) {
      return getDateLabelInTz(date);
    }
    
    // Fallback to browser timezone
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

  // Summary stats
  const stats = {
    pending: followUps.filter(f => f.status === 'pending').length,
    overdue: followUps.filter(f => f.status === 'overdue').length,
    completed: followUps.filter(f => f.status === 'completed').length,
    completionRate: followUps.length > 0 
      ? Math.round((followUps.filter(f => f.status === 'completed').length / followUps.length) * 100)
      : 0
  };

  return (
    <div className="page-fade-in">
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Follow-ups</h1>
            <Button onClick={() => loadFollowUps()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
              </CardContent>
            </Card>
          </div>

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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Follow-ups List */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <Loading variant="card" text="Loading follow-ups..." />
              ) : filteredFollowUps.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">No follow-ups found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredFollowUps.map((followUp) => (
                    <div key={followUp.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(followUp.status)}
                            <span className="text-sm text-muted-foreground">
                              {getDateLabel(followUp.scheduled_for)} at {formatDateInTz(followUp.scheduled_for, 'h:mm a')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{followUp.contact_name || 'Unknown Contact'}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {followUp.contact_email && (
                                <a href={`mailto:${followUp.contact_email}`} className="flex items-center gap-1 hover:text-primary">
                                  <Mail className="w-3 h-3" />
                                  {followUp.contact_email}
                                </a>
                              )}
                              {followUp.contact_phone && (
                                <a href={`tel:${followUp.contact_phone}`} className="flex items-center gap-1 hover:text-primary">
                                  <Phone className="w-3 h-3" />
                                  {followUp.contact_phone}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-muted-foreground" />
                              Assigned to: {followUp.assigned_to_name || 'Unassigned'}
                            </span>
                            <span className="text-muted-foreground">
                              Original appointment: {formatDateInTz(followUp.original_appointment_date || '', 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
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
                              {followUp.status === 'completed' && followUp.show_outcome ? followUp.show_outcome : followUp.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Complete Follow-up Dialog */}
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Complete Follow-up</DialogTitle>
              <DialogDescription>
                Record the outcome of your follow-up with {selectedFollowUp?.contact_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Call Outcome</Label>
                <RadioGroup
                  value={completeForm.call_outcome}
                  onValueChange={(v) => setCompleteForm({ ...completeForm, call_outcome: v })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Show" id="Show" />
                    <Label htmlFor="Show">Show</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="No Show" id="No Show" />
                    <Label htmlFor="No Show">No Show</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Reschedule" id="Reschedule" />
                    <Label htmlFor="Reschedule">Reschedule</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Cancel" id="Cancel" />
                    <Label htmlFor="Cancel">Cancel</Label>
                  </div>
                </RadioGroup>
              </div>

              {completeForm.call_outcome === 'Show' && (
                <>
                  <div>
                    <Label>Show Outcome</Label>
                    <RadioGroup
                      value={completeForm.show_outcome}
                      onValueChange={(v) => setCompleteForm({ ...completeForm, show_outcome: v })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="won" id="won" />
                        <Label htmlFor="won">Won 🎉</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="lost" id="lost" />
                        <Label htmlFor="lost">Lost</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="follow up" id="follow up" />
                        <Label htmlFor="follow up">Follow Up Again</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="pitched"
                        checked={completeForm.pitched}
                        onChange={(e) => setCompleteForm({ ...completeForm, pitched: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="pitched">Pitched</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="watched_assets"
                        checked={completeForm.watched_assets}
                        onChange={(e) => setCompleteForm({ ...completeForm, watched_assets: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="watched_assets">Watched Assets</Label>
                    </div>
                  </div>

                  {completeForm.show_outcome === 'won' && (
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
                  )}

                  <div>
                    <Label>Lead Quality (1-5)</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <Button
                          key={rating}
                          variant={completeForm.lead_quality === rating ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCompleteForm({ ...completeForm, lead_quality: rating })}
                        >
                          {rating}
                        </Button>
                      ))}
                    </div>
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
                <div className="space-y-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="schedule_next"
                      checked={completeForm.schedule_next_follow_up}
                      onChange={(e) => setCompleteForm({ ...completeForm, schedule_next_follow_up: e.target.checked })}
                      className="rounded border-gray-300"
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

export default function FollowUpsPage() {
  return (
    <LayoutWrapper>
      <FollowUpsContent />
    </LayoutWrapper>
  )
} 