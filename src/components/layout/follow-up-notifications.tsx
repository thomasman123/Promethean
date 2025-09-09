'use client';

import { useState, useEffect } from 'react';
import { useEffectiveUser } from '@/hooks/use-effective-user';
import { supabase } from '@/lib/supabase';
import { Bell, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';

interface FollowUpNotification {
  id: string;
  follow_up_id: string;
  notification_type: string;
  scheduled_for: string;
  sent_at?: string;
  acknowledged_at?: string;
  delivery_status: string;
  title: string;
  message: string;
  action_url?: string;
}

export function FollowUpNotifications() {
  const { user } = useEffectiveUser();
  const [notifications, setNotifications] = useState<FollowUpNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Set up real-time subscription
      const subscription = supabase
        .channel('follow_up_notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'follow_up_notifications',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follow_up_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('delivery_status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(10);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount((data || []).filter((n: FollowUpNotification) => !n.acknowledged_at).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const acknowledgeNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('follow_up_notifications')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          delivery_status: 'acknowledged'
        })
        .eq('id', notificationId);

      if (error) throw error;
      loadNotifications();
    } catch (error) {
      console.error('Error acknowledging notification:', error);
    }
  };

  const acknowledgeAll = async () => {
    try {
      const { error } = await supabase
        .from('follow_up_notifications')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          delivery_status: 'acknowledged'
        })
        .eq('user_id', user?.id)
        .is('acknowledged_at', null);

      if (error) throw error;
      loadNotifications();
      setIsOpen(false);
    } catch (error) {
      console.error('Error acknowledging all notifications:', error);
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Follow-up Reminders</h3>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={acknowledgeAll}
                className="text-xs"
              >
                Mark all as read
              </Button>
            )}
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No pending follow-up reminders
            </div>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className="border-0 border-b rounded-none">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-sm">{notification.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.scheduled_for), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.action_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          onClick={() => setIsOpen(false)}
                        >
                          <a href={notification.action_url}>View</a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => acknowledgeNotification(notification.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        {notifications.length > 0 && (
          <div className="p-4 border-t">
            <Button variant="outline" className="w-full" asChild>
              <a href="/follow-ups">View all follow-ups</a>
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
} 