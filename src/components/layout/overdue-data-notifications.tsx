'use client';

import { useState, useEffect } from 'react';
import { useEffectiveUser } from '@/hooks/use-effective-user';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/lib/database.types';
import { AlertCircle, Calendar, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';

interface OverdueItem {
  id: string;
  type: 'discovery' | 'appointment';
  contact_name: string;
  contact_email: string;
  date_booked_for: string;
  overdue_hours: number;
  account_name: string;
}

export function OverdueDataNotifications() {
  const { user } = useEffectiveUser();
  const [items, setItems] = useState<OverdueItem[]>([]);
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (user) {
      loadOverdueItems();
      // Refresh every 5 minutes
      const interval = setInterval(loadOverdueItems, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Refresh on navigation
  useEffect(() => {
    const handleRouteChange = () => {
      if (user) loadOverdueItems();
    };
    
    window.addEventListener('focus', handleRouteChange);
    return () => window.removeEventListener('focus', handleRouteChange);
  }, [user]);

  const loadOverdueItems = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications/overdue');
      if (!response.ok) {
        throw new Error('Failed to fetch overdue items');
      }
      
      const data = await response.json();
      setItems(data.items || []);
      setCount(data.count || 0);
    } catch (error) {
      console.error('Error loading overdue items:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatOverdueTime = (hours: number) => {
    if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h ago`;
    }
  };

  const handleCompleteNow = () => {
    setIsOpen(false);
    router.push('/update-data/complete');
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-8 w-8"
        >
          <AlertCircle className={count > 0 ? "h-5 w-5 text-red-500" : "h-5 w-5"} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center font-semibold">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b bg-red-50 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Overdue Data Entry</h3>
            </div>
            {count > 0 && (
              <Badge variant="destructive">{count} overdue</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Items pending completion for over 24 hours
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No overdue items. Great job! 🎉
              </p>
            </div>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="border-0 border-b rounded-none last:border-b-0">
                <CardContent className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.type === 'appointment' ? (
                          <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : (
                          <Users className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <p className="font-medium text-sm truncate">
                          {item.contact_name}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="text-xs whitespace-nowrap"
                        >
                          {item.type === 'appointment' ? 'Appt' : 'Disc'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">
                        {item.contact_email}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="truncate">{item.account_name}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {formatOverdueTime(item.overdue_hours)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        {count > 0 && (
          <div className="p-4 border-t bg-muted/30">
            <Button 
              variant="default" 
              className="w-full bg-red-500 hover:bg-red-600" 
              onClick={handleCompleteNow}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Complete Now
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

