'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Plus, Save, AlertCircle, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  SidebarInset, 
  SidebarTrigger 
} from '@/components/ui/sidebar';
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/useAuth';

interface SourceMapping {
  id?: string;
  ghl_source: string;
  source_category: string;
  specific_source?: string | null;
  description?: string | null;
  is_active: boolean | null;
  is_new?: boolean;
  has_changes?: boolean;
  is_contact_source?: boolean;
}

interface SourceCategory {
  name: string;
  display_name: string;
  description: string | null;
}

interface SourceUsage {
  ghl_source: string;
  appointment_count: number;
  discovery_count: number;
  total_count: number;
  mapped_category?: string;
  mapped_specific?: string | null;
}

export default function SourceMappingPage() {
  const { user, loading, getAccountBasedPermissions, selectedAccountId } = useAuth();
  const permissions = getAccountBasedPermissions();
  const router = useRouter();
  const [mappings, setMappings] = useState<SourceMapping[]>([]);
  const [categories, setCategories] = useState<SourceCategory[]>([]);
  const [unmappedSources, setUnmappedSources] = useState<string[]>([]);
  const [contactMappings, setContactMappings] = useState<SourceMapping[]>([]);
  const [unmappedContactSources, setUnmappedContactSources] = useState<{contact_source: string, usage_count: number}[]>([]);
  const [sourceUsage, setSourceUsage] = useState<SourceUsage[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Handle authentication and permissions
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.replace('/login');
      return;
    }
    
    if (!permissions.canManageAccount) {
      router.replace('/dashboard');
      return;
    }
  }, [user, loading, permissions.canManageAccount, router]);

  // Load data when account changes
  useEffect(() => {
    if (selectedAccountId && permissions.canManageAccount && !loading) {
      fetchData();
    }
  }, [selectedAccountId, permissions.canManageAccount, loading]);

  const fetchData = async () => {
    if (!selectedAccountId) return;
    
    try {
      setDataLoading(true);
      
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('source_categories')
        .select('*')
        .order('display_name');

      if (catError) throw catError;
      setCategories(categoriesData || []);

      // Fetch existing mappings for this account
      const { data: mappingsData, error: mapError } = await supabase
        .from('ghl_source_mappings')
        .select('*')
        .eq('account_id', selectedAccountId)
        .order('ghl_source');

      if (mapError) throw mapError;
      setMappings(mappingsData || []);

      // Fetch unmapped sources
      const { data: unmappedData, error: unmappedError } = await supabase
        .rpc('get_unmapped_sources', { p_account_id: selectedAccountId });

      if (unmappedError) throw unmappedError;
      setUnmappedSources(unmappedData?.map((u: any) => u.ghl_source) || []);

      // Fetch contact source mappings
      const { data: contactMappingsData, error: contactMapError } = await supabase
        .from('contact_source_mappings')
        .select('*')
        .eq('account_id', selectedAccountId)
        .order('contact_source');

      if (contactMapError) throw contactMapError;
      setContactMappings(contactMappingsData?.map((mapping: any) => ({
        ghl_source: mapping.contact_source, // Use ghl_source field for consistency
        source_category: mapping.source_category,
        specific_source: mapping.specific_source,
        description: mapping.description,
        is_active: mapping.is_active,
        id: mapping.id,
        is_contact_source: true // Flag to identify contact sources
      })) || []);

      // Fetch unmapped contact sources
      const { data: unmappedContactData, error: unmappedContactError } = await supabase
        .rpc('get_unmapped_contact_sources', { p_account_id: selectedAccountId });

      if (unmappedContactError) throw unmappedContactError;
      setUnmappedContactSources(unmappedContactData || []);

      // Fetch source usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('appointments')
        .select('ghl_source')
        .eq('account_id', selectedAccountId)
        .not('ghl_source', 'is', null);

      const { data: discoveryUsageData, error: discoveryUsageError } = await supabase
        .from('discoveries')
        .select('ghl_source')
        .eq('account_id', selectedAccountId)
        .not('ghl_source', 'is', null);

      if (usageError || discoveryUsageError) {
        console.warn('Failed to fetch usage data:', usageError || discoveryUsageError);
      } else {
        // Combine and count usage
        const sourceCounts: Record<string, { appointments: number; discoveries: number }> = {};
        
        usageData?.forEach((item: any) => {
          const source = item.ghl_source;
          if (!sourceCounts[source]) sourceCounts[source] = { appointments: 0, discoveries: 0 };
          sourceCounts[source].appointments++;
        });

        discoveryUsageData?.forEach((item: any) => {
          const source = item.ghl_source;
          if (!sourceCounts[source]) sourceCounts[source] = { appointments: 0, discoveries: 0 };
          sourceCounts[source].discoveries++;
        });

        const usage: SourceUsage[] = Object.entries(sourceCounts).map(([source, counts]) => {
          const mapping = mappingsData?.find(m => m.ghl_source === source);
          return {
            ghl_source: source,
            appointment_count: counts.appointments,
            discovery_count: counts.discoveries,
            total_count: counts.appointments + counts.discoveries,
            mapped_category: mapping?.source_category,
            mapped_specific: mapping?.specific_source
          };
        }).sort((a, b) => b.total_count - a.total_count);

        setSourceUsage(usage);
      }
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load source mappings');
    } finally {
      setDataLoading(false);
    }
  };

  const updateMapping = (ghlSource: string, field: string, value: any) => {
    // Update GHL mappings
    setMappings(prev => prev.map(m => 
      m.ghl_source === ghlSource 
        ? { ...m, [field]: value, has_changes: true }
        : m
    ));
    
    // Update contact mappings
    setContactMappings(prev => prev.map(m => 
      m.ghl_source === ghlSource 
        ? { ...m, [field]: value, has_changes: true }
        : m
    ));
  };

  const saveMapping = async (mapping: SourceMapping) => {
    if (!selectedAccountId) return;
    
    try {
      setSaving(true);

      if (mapping.is_contact_source) {
        // Save to contact_source_mappings table
        const { error } = await supabase
          .from('contact_source_mappings')
          .upsert({
            id: mapping.id,
            contact_source: mapping.ghl_source,
            source_category: mapping.source_category,
            specific_source: mapping.specific_source,
            description: mapping.description,
            is_active: mapping.is_active,
            account_id: selectedAccountId,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        setContactMappings(prev => prev.map(m => 
          m.ghl_source === mapping.ghl_source 
            ? { ...m, has_changes: false, is_new: false }
            : m
        ));

        // Remove from unmapped contact sources
        setUnmappedContactSources(prev => prev.filter(s => s.contact_source !== mapping.ghl_source));
      } else {
        // Save to ghl_source_mappings table
        const { error } = await supabase
          .from('ghl_source_mappings')
          .upsert({
            ...mapping,
            account_id: selectedAccountId,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;

        setMappings(prev => prev.map(m => 
          m.ghl_source === mapping.ghl_source 
            ? { ...m, has_changes: false, is_new: false }
            : m
        ));

        // Remove from unmapped if it was there
        setUnmappedSources(prev => prev.filter(s => s !== mapping.ghl_source));
      }

      toast.success(`Saved mapping for ${mapping.ghl_source}`);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast.error('Failed to save mapping');
    } finally {
      setSaving(false);
    }
  };

  const addUnmappedSource = (source: string) => {
    const newMapping: SourceMapping = {
      ghl_source: source,
      source_category: 'unknown',
      specific_source: '',
      description: '',
      is_active: true,
      is_new: true,
      has_changes: true
    };
    
    setMappings(prev => [...prev, newMapping]);
    setUnmappedSources(prev => prev.filter(s => s !== source));
  };

  const addUnmappedContactSource = (source: string) => {
    const newMapping: SourceMapping = {
      ghl_source: source,
      source_category: 'unknown',
      specific_source: '',
      description: '',
      is_active: true,
      is_new: true,
      has_changes: true,
      is_contact_source: true
    };
    
    setContactMappings(prev => [...prev, newMapping]);
    setUnmappedContactSources(prev => prev.filter(s => s.contact_source !== source));
  };

  const addCustomSource = () => {
    const source = prompt('Enter new GHL source name:');
    if (!source || mappings.some(m => m.ghl_source === source)) return;

    const newMapping: SourceMapping = {
      ghl_source: source,
      source_category: 'unknown',
      specific_source: '',
      description: '',
      is_active: true,
      is_new: true,
      has_changes: true
    };
    
    setMappings(prev => [...prev, newMapping]);
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground mt-2">Loading...</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  // Show access denied if no user or permissions
  if (!user || !permissions.canManageAccount) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">
              {!user 
                ? 'You need to be logged in to access this page.' 
                : 'You need moderator permissions to access source mapping.'
              }
            </p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/account">Account</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Source Mapping</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Source Attribution Mapping</h1>
          <p className="text-muted-foreground mt-2">
            Map GHL sources to your business categories and track detailed attribution
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">Loading source mappings...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unmapped Sources Alert */}
            {unmappedSources.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>New GHL sources detected:</strong> {unmappedSources.join(', ')}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {unmappedSources.map(source => (
                      <Button
                        key={source}
                        size="sm"
                        variant="outline"
                        onClick={() => addUnmappedSource(source)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add {source}
                      </Button>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Unmapped Contact Sources Alert */}
            {unmappedContactSources.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription>
                  <strong className="text-orange-800">Contact sources needing mapping:</strong>
                  <div className="mt-2 space-y-2">
                    {unmappedContactSources.map(source => (
                      <div key={source.contact_source} className="flex items-center justify-between">
                        <span className="text-orange-700">
                          "{source.contact_source}" ({source.usage_count} uses)
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addUnmappedContactSource(source.contact_source)}
                          className="ml-2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Map Contact Source
                        </Button>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Current Mappings */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Source Mappings
                    </CardTitle>
                    <CardDescription>
                      Map each GHL source to a business category and specific source
                    </CardDescription>
                  </div>
                  <Button onClick={addCustomSource} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Source
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...mappings, ...contactMappings].map((mapping) => (
                    <Card 
                      key={mapping.ghl_source} 
                      className={`p-4 ${mapping.is_new ? 'border-blue-500' : ''} ${mapping.has_changes ? 'border-orange-500' : ''}`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                                                  <div className="flex items-center gap-2">
                          <Label className="font-medium">
                            {mapping.is_contact_source ? 'Contact Source:' : 'GHL Source:'}
                          </Label>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {mapping.ghl_source}
                          </code>
                          {mapping.is_contact_source && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Contact</Badge>}
                          {!mapping.is_contact_source && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">GHL</Badge>}
                          {mapping.is_new && <Badge variant="secondary">New</Badge>}
                          {mapping.has_changes && !mapping.is_new && <Badge variant="outline">Modified</Badge>}
                        </div>

                          <div>
                            <Label htmlFor={`category-${mapping.ghl_source}`}>Business Category</Label>
                            <Select 
                              value={mapping.source_category}
                              onValueChange={(value) => updateMapping(mapping.ghl_source, 'source_category', value)}
                            >
                              <SelectTrigger id={`category-${mapping.ghl_source}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.name} value={cat.name}>
                                    <div>
                                      <div className="font-medium">{cat.display_name}</div>
                                      <div className="text-xs text-muted-foreground">{cat.description}</div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor={`specific-${mapping.ghl_source}`}>Specific Source</Label>
                            <Input
                              id={`specific-${mapping.ghl_source}`}
                              value={mapping.specific_source || ''}
                              onChange={(e) => updateMapping(mapping.ghl_source, 'specific_source', e.target.value)}
                              placeholder="e.g., VSL Landing Page, Facebook Campaign XYZ"
                            />
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`desc-${mapping.ghl_source}`}>Description</Label>
                            <Textarea
                              id={`desc-${mapping.ghl_source}`}
                              value={mapping.description || ''}
                              onChange={(e) => updateMapping(mapping.ghl_source, 'description', e.target.value)}
                              placeholder="Optional notes about this source"
                              rows={3}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`active-${mapping.ghl_source}`}
                                checked={mapping.is_active || false}
                                onCheckedChange={(checked) => updateMapping(mapping.ghl_source, 'is_active', checked)}
                              />
                              <Label htmlFor={`active-${mapping.ghl_source}`}>
                                {mapping.is_active ? 'Active' : 'Inactive'}
                              </Label>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => saveMapping(mapping)}
                              disabled={!mapping.has_changes || saving}
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {mappings.length === 0 && contactMappings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No source mappings configured yet. Add sources from the detected lists above or create custom ones.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Source Usage */}
            <Card>
              <CardHeader>
                <CardTitle>Your Source Activity</CardTitle>
                <CardDescription>
                  Real data from your appointments and discoveries, sorted by frequency
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sourceUsage.length > 0 ? (
                  <div className="space-y-3">
                    {sourceUsage.map((usage) => (
                      <div key={usage.ghl_source} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {usage.ghl_source}
                            </code>
                            {usage.mapped_category && (
                              <Badge variant="secondary">
                                {categories.find(c => c.name === usage.mapped_category)?.display_name || usage.mapped_category}
                              </Badge>
                            )}
                            {usage.mapped_specific && (
                              <span className="text-sm text-muted-foreground">
                                "{usage.mapped_specific}"
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium">
                            {usage.total_count} total
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{usage.appointment_count} appointments</span>
                          <span>{usage.discovery_count} discoveries</span>
                          {!usage.mapped_category && (
                            <Badge variant="outline" className="text-xs">
                              Unmapped
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No source data found yet.</p>
                    <p className="text-sm mt-1">
                      Source tracking will appear here as appointments and discoveries come through your webhooks.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SidebarInset>
  );
} 