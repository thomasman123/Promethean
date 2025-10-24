'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle2, Phone } from 'lucide-react';

interface BackfillResult {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  duplicates: number;
  inbound: number;
}

export default function BackfillCallsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<BackfillResult | null>(null);

  // Load accounts on mount
  useState(() => {
    loadAccounts();
  });

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || userData.role !== 'admin') {
        setError('Access denied. Admin only.');
        setLoadingAccounts(false);
        return;
      }

      // Load all accounts with GHL connection
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, name, ghl_location_id')
        .not('ghl_location_id', 'is', null)
        .order('name');

      if (accountsError) throw accountsError;

      setAccounts(accountsData || []);
      setLoadingAccounts(false);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load accounts');
      setLoadingAccounts(false);
    }
  }

  async function handleBackfill() {
    if (!selectedAccountId || !startDate || !endDate) {
      setError('Please fill in all fields');
      return;
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError('Start date must be before end date');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess(null);

      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Call backfill API
      const response = await fetch('/api/admin/backfill-calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          accountId: selectedAccountId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate + 'T23:59:59').toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to backfill calls');
      }

      setSuccess(data.results);
      setLoading(false);
    } catch (err) {
      console.error('Error backfilling calls:', err);
      setError(err instanceof Error ? err.message : 'Failed to backfill calls');
      setLoading(false);
    }
  }

  if (loadingAccounts) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Phone className="h-8 w-8" />
          Backfill Outbound Calls
        </h1>
        <p className="text-gray-600 mt-2">
          Import historical outbound call data from GoHighLevel and process them through the same logic as webhooks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backfill Configuration</CardTitle>
          <CardDescription>
            Select an account and date range to fetch and process outbound calls. This will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Fetch all outbound calls from GHL for the date range</li>
              <li>Assign setter user IDs by linking to platform users</li>
              <li>Calculate answered (duration &gt; 30s) and meaningful conversation (duration &gt; 120s) flags</li>
              <li>Link calls to appointments within ±30 minutes (mark as booked)</li>
              <li>Skip calls that already exist in the database</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger id="account">
                <SelectValue placeholder="Select an account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-semibold mb-2">Backfill Complete!</div>
                <div className="space-y-1 text-sm">
                  <div>Total outbound calls: {success.total}</div>
                  <div className="text-green-600 font-medium">✅ Processed: {success.processed}</div>
                  <div className="text-gray-600">⏭️ Skipped: {success.skipped}</div>
                  <div className="text-gray-500 ml-4">- Duplicates: {success.duplicates}</div>
                  {success.errors > 0 && (
                    <div className="text-orange-600">⚠️ Errors: {success.errors}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleBackfill}
            disabled={loading || !selectedAccountId || !startDate || !endDate}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Calls...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Start Backfill
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div>
            <strong className="text-gray-900">1. Fetch Calls</strong>
            <p>Uses the GHL Export Messages API to fetch all call messages for the selected date range.</p>
          </div>
          <div>
            <strong className="text-gray-900">2. Process Each Call</strong>
            <p>Runs the same processing logic as the webhook system:</p>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Fetches contact information from GHL</li>
              <li>Fetches setter information and links to platform users</li>
              <li>Determines if answered (duration &gt; 30 seconds)</li>
              <li>Determines if meaningful conversation (duration &gt; 120 seconds)</li>
              <li>Creates or updates contact record</li>
              <li>Creates dial record</li>
            </ul>
          </div>
          <div>
            <strong className="text-gray-900">3. Link to Appointments</strong>
            <p>Automatically links dials to appointments that were booked within ±30 minutes of the call, marking the dial as "booked".</p>
          </div>
          <div>
            <strong className="text-gray-900">4. Skip Duplicates</strong>
            <p>Checks if a dial with the same date/time already exists and skips it to prevent duplicates.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

