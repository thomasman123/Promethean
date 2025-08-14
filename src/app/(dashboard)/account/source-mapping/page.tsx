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
import { Loader2, Save, AlertCircle } from 'lucide-react';
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
  source: string;
  source_type: 'ghl' | 'contact';
  source_category: string;
  specific_source?: string | null;
  description?: string | null;
  is_active: boolean;
  is_new?: boolean;
  has_changes?: boolean;
}

interface SourceCategory {
  name: string;
  display_name: string;
  description: string | null;
}

export default function SourceMappingPage() {
  const { user, loading, getAccountBasedPermissions, selectedAccountId } = useAuth();
  const permissions = getAccountBasedPermissions();
  const router = useRouter();
  const [mappings, setMappings] = useState<SourceMapping[]>([]);
  const [categories, setCategories] = useState<SourceCategory[]>([]);
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

      // Fetch all sources that need mapping (both mapped and unmapped)
      const allMappings: SourceMapping[] = [];

      // Get GHL sources (both mapped and unmapped)
      const { data: ghlMappings, error: ghlError } = await supabase
        .from('ghl_source_mappings')
        .select('*')
        .eq('account_id', selectedAccountId);

      if (ghlError) throw ghlError;

      const { data: unmappedGhl, error: unmappedGhlError } = await supabase
        .rpc('get_unmapped_sources', { p_account_id: selectedAccountId });

      if (unmappedGhlError) throw unmappedGhlError;

      // Add existing GHL mappings
      ghlMappings?.forEach(mapping => {
        allMappings.push({
          id: mapping.id,
          source: mapping.ghl_source,
          source_type: 'ghl',
          source_category: mapping.source_category,
          specific_source: mapping.specific_source,
          description: mapping.description,
          is_active: mapping.is_active
        });
      });

      // Add unmapped GHL sources
      unmappedGhl?.forEach((item: any) => {
        allMappings.push({
          source: item.ghl_source,
          source_type: 'ghl',
          source_category: 'unknown',
          specific_source: '',
          description: '',
          is_active: true,
          is_new: true,
          has_changes: true
        });
      });

      // Get contact sources (both mapped and unmapped)
      const { data: contactMappings, error: contactError } = await supabase
        .from('contact_source_mappings')
        .select('*')
        .eq('account_id', selectedAccountId);

      if (contactError) throw contactError;

      const { data: unmappedContact, error: unmappedContactError } = await supabase
        .rpc('get_unmapped_contact_sources', { p_account_id: selectedAccountId });

      if (unmappedContactError) throw unmappedContactError;

      // Add existing contact mappings
      contactMappings?.forEach(mapping => {
        allMappings.push({
          id: mapping.id,
          source: mapping.contact_source,
          source_type: 'contact',
          source_category: mapping.source_category,
          specific_source: mapping.specific_source,
          description: mapping.description,
          is_active: mapping.is_active
        });
      });

      // Add unmapped contact sources
      unmappedContact?.forEach((item: any) => {
        allMappings.push({
          source: item.contact_source,
          source_type: 'contact',
          source_category: 'unknown',
          specific_source: '',
          description: '',
          is_active: true,
          is_new: true,
          has_changes: true
        });
      });

      // Sort: new/unmapped first, then by source name
      allMappings.sort((a, b) => {
        if (a.is_new && !b.is_new) return -1;
        if (!a.is_new && b.is_new) return 1;
        return a.source.localeCompare(b.source);
      });

      setMappings(allMappings);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load source mappings');
    } finally {
      setDataLoading(false);
    }
  };

  const updateMapping = (source: string, sourceType: 'ghl' | 'contact', field: string, value: any) => {
    setMappings(prev => prev.map(m => 
      m.source === source && m.source_type === sourceType
        ? { ...m, [field]: value, has_changes: true }
        : m
    ));
  };

  const saveMapping = async (mapping: SourceMapping) => {
    if (!selectedAccountId) return;
    
    try {
      setSaving(true);

      if (mapping.source_type === 'ghl') {
        const { error } = await supabase
          .from('ghl_source_mappings')
          .upsert({
            id: mapping.id,
            ghl_source: mapping.source,
            source_category: mapping.source_category,
            specific_source: mapping.specific_source,
            description: mapping.description,
            is_active: mapping.is_active,
            account_id: selectedAccountId,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contact_source_mappings')
          .upsert({
            id: mapping.id,
            contact_source: mapping.source,
            source_category: mapping.source_category,
            specific_source: mapping.specific_source,
            description: mapping.description,
            is_active: mapping.is_active,
            account_id: selectedAccountId,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      setMappings(prev => prev.map(m => 
        m.source === mapping.source && m.source_type === mapping.source_type
          ? { ...m, has_changes: false, is_new: false }
          : m
      ));

      toast.success(`Saved mapping for ${mapping.source}`);
    } catch (error) {
      console.error('Failed to save mapping:', error);
      toast.error('Failed to save mapping');
    } finally {
      setSaving(false);
    }
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

  const newMappings = mappings.filter(m => m.is_new);
  const existingMappings = mappings.filter(m => !m.is_new);

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

      <div className="container mx-auto p-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Source Mapping</h1>
          <p className="text-muted-foreground mt-2">
            Map detected sources to business categories for better tracking
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground mt-2">Loading sources...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* New Sources Alert */}
            {newMappings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{newMappings.length} new source{newMappings.length > 1 ? 's' : ''} detected:</strong> Map them to categories below
                </AlertDescription>
              </Alert>
            )}

            {/* All Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Sources</CardTitle>
                <CardDescription>
                  All detected sources from your data - map them to business categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mappings.map((mapping) => (
                    <Card 
                      key={`${mapping.source}-${mapping.source_type}`}
                      className={`p-4 ${mapping.is_new ? 'border-blue-500 bg-blue-50/50' : ''} ${mapping.has_changes ? 'border-orange-500' : ''}`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Label className="font-medium">Source:</Label>
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {mapping.source}
                            </code>
                            <Badge variant="outline" className={mapping.source_type === 'ghl' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                              {mapping.source_type === 'ghl' ? 'GHL' : 'Contact'}
                            </Badge>
                            {mapping.is_new && <Badge variant="secondary">New</Badge>}
                            {mapping.has_changes && !mapping.is_new && <Badge variant="outline">Modified</Badge>}
                          </div>

                          <div>
                            <Label htmlFor={`category-${mapping.source}-${mapping.source_type}`}>Business Category</Label>
                            <Select 
                              value={mapping.source_category}
                              onValueChange={(value) => updateMapping(mapping.source, mapping.source_type, 'source_category', value)}
                            >
                              <SelectTrigger id={`category-${mapping.source}-${mapping.source_type}`}>
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
                            <Label htmlFor={`specific-${mapping.source}-${mapping.source_type}`}>Specific Source</Label>
                            <Input
                              id={`specific-${mapping.source}-${mapping.source_type}`}
                              value={mapping.specific_source || ''}
                              onChange={(e) => updateMapping(mapping.source, mapping.source_type, 'specific_source', e.target.value)}
                              placeholder="e.g., VSL Landing Page, Facebook Campaign XYZ"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <Label htmlFor={`desc-${mapping.source}-${mapping.source_type}`}>Description</Label>
                            <Textarea
                              id={`desc-${mapping.source}-${mapping.source_type}`}
                              value={mapping.description || ''}
                              onChange={(e) => updateMapping(mapping.source, mapping.source_type, 'description', e.target.value)}
                              placeholder="Optional notes about this source"
                              rows={3}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`active-${mapping.source}-${mapping.source_type}`}
                                checked={mapping.is_active}
                                onCheckedChange={(checked) => updateMapping(mapping.source, mapping.source_type, 'is_active', checked)}
                              />
                              <Label htmlFor={`active-${mapping.source}-${mapping.source_type}`}>
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

                {mappings.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No sources detected yet. Sources will appear here as your system receives appointments and discoveries.
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