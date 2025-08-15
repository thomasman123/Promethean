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
import { ArrowRight, ExternalLink, TrendingUp, Users } from 'lucide-react';

interface SourceMapping {
  id?: string;
  source: string;
  source_type: 'ghl' | 'contact' | 'utm';
  source_category: string;
  specific_source?: string | null;
  description?: string | null;
  is_active: boolean;
  is_new?: boolean;
  has_changes?: boolean;
  is_recommended?: boolean;
  source_identifier?: string;
  utm_source?: string;
  utm_medium?: string;
  // Enhanced attribution fields
  attribution_details?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
    utm_id?: string;
    fbclid?: string;
    landing_url?: string;
    session_source?: string;
    campaigns?: string[];
    campaign_performance?: {
      total_leads: number;
      high_value_leads: number;
      conversion_rate: string;
      attribution_confidence: string;
    };
  };
  funnel_journey?: Array<{
    step: string;
    source: string;
    timestamp?: string;
  }>;
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

      // Fetch all sources that need mapping using the new UTM-based system
      const allMappings: SourceMapping[] = [];

      // Get existing UTM mappings
      const { data: utmMappings, error: utmError } = await supabase
        .from('utm_attribution_mappings')
        .select('*')
        .eq('account_id', selectedAccountId)
        .eq('is_active', true);

      if (utmError) throw utmError;

      // Get all unmapped sources (UTM + legacy)
      const { data: unmappedSources, error: unmappedError } = await supabase
        .rpc('get_all_unmapped_sources', { p_account_id: selectedAccountId });

      if (unmappedError) throw unmappedError;

      // Add existing UTM mappings
      utmMappings?.forEach(mapping => {
        allMappings.push({
          id: mapping.id,
          source: `${mapping.utm_source || 'null'} (${mapping.utm_medium || 'null'})`,
          source_type: 'utm',
          source_category: mapping.source_category,
          specific_source: mapping.specific_source,
          description: mapping.description,
          is_active: mapping.is_active,
          utm_source: mapping.utm_source,
          utm_medium: mapping.utm_medium
        });
      });

      // Add all unmapped sources (UTM-based and legacy)
      unmappedSources?.forEach((item: any) => {
        const attribution = item.sample_attribution;
        const mapping: SourceMapping = {
          source: item.source_display,
          source_type: item.source_type as 'utm' | 'contact' | 'ghl',
          source_category: 'unknown',
          specific_source: '',
          description: '',
          is_active: true,
          is_new: true,
          has_changes: true,
          is_recommended: item.is_recommended,
          source_identifier: item.source_identifier
        };

        // Add enhanced attribution details
        if (attribution || item.campaigns?.length || item.high_value_leads_count) {
          mapping.attribution_details = {
            utm_source: attribution?.utm_source,
            utm_medium: attribution?.utm_medium,
            utm_campaign: attribution?.campaigns?.[0],
            campaigns: item.campaigns,
            campaign_performance: {
              total_leads: item.usage_count || 0,
              high_value_leads: item.high_value_leads_count || 0,
              conversion_rate: item.high_value_leads_count && item.usage_count 
                ? `${Math.round((item.high_value_leads_count / item.usage_count) * 100)}%`
                : '0%',
              attribution_confidence: item.is_recommended ? 'high' : 'low'
            }
          };
        }

        // Add funnel journey for UTM sources
        if (item.source_type === 'utm' && attribution?.utm_source) {
          const utmSource = attribution.utm_source;
          const utmMedium = attribution.utm_medium;
          
          if (utmSource === 'ig' && utmMedium === 'ppc') {
            mapping.funnel_journey = [
              { step: 'Instagram Ad', source: 'Instagram' },
              { step: 'Landing Page', source: 'Funnel' },
              { step: 'Form Submit', source: 'Lead Capture' },
              { step: 'Demo Meeting', source: 'Sales Call' }
            ];
          } else if (utmSource === 'fb' && utmMedium === 'ppc') {
            mapping.funnel_journey = [
              { step: 'Facebook Ad', source: 'Facebook' },
              { step: 'Landing Page', source: 'Funnel' },
              { step: 'Form Submit', source: 'Lead Capture' },
              { step: 'Demo Meeting', source: 'Sales Call' }
            ];
          }
        }

        allMappings.push(mapping);
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

  const updateMapping = (source: string, sourceType: 'ghl' | 'contact' | 'utm', field: string, value: any) => {
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

      if (mapping.source_type === 'utm') {
        // Parse UTM source and medium from source_identifier
        const [utmSource, utmMedium] = mapping.source_identifier?.split('|') || ['', ''];
        
        const { error } = await supabase
          .rpc('save_utm_mapping', {
            p_account_id: selectedAccountId,
            p_utm_source: utmSource === 'null' ? null : utmSource,
            p_utm_medium: utmMedium === 'null' ? null : utmMedium,
            p_source_category: mapping.source_category,
            p_specific_source: mapping.specific_source,
            p_description: mapping.description
          });

        if (error) throw error;
      } else if (mapping.source_type === 'ghl') {
        const { error } = await supabase
          .from('ghl_source_mappings')
          .upsert({
            id: mapping.id,
            ghl_source: mapping.source_identifier || mapping.source,
            source_category: mapping.source_category,
            specific_source: mapping.specific_source,
            description: mapping.description,
            is_active: mapping.is_active,
            account_id: selectedAccountId,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
      } else {
        // Contact source mapping (legacy)
        const { error } = await supabase
          .from('contact_source_mappings')
          .upsert({
            id: mapping.id,
            contact_source: mapping.source_identifier || mapping.source,
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

      <div className="container mx-auto p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Source Mapping</h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Automatic UTM-based attribution with manual override options
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-3">Loading sources...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* UTM Sources vs Legacy Alert */}
            {newMappings.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <strong>{newMappings.filter(m => m.is_recommended).length} UTM source{newMappings.filter(m => m.is_recommended).length !== 1 ? 's' : ''} detected</strong> for automatic mapping.
                  {newMappings.filter(m => !m.is_recommended).length > 0 && (
                    <span> <strong>{newMappings.filter(m => !m.is_recommended).length} legacy source{newMappings.filter(m => !m.is_recommended).length !== 1 ? 's' : ''}</strong> should be cleaned up.</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* UTM Sources (Recommended) */}
            {mappings.filter(m => m.is_recommended).length > 0 && (
              <Card className="shadow-sm border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    🎯 UTM Sources (Recommended)
                  </CardTitle>
                  <CardDescription className="text-base">
                    Smart UTM-based attribution provides accurate traffic source tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    {mappings.filter(m => m.is_recommended).map((mapping) => (
                      <Card 
                        key={`${mapping.source}-${mapping.source_type}`}
                        className={`p-6 border-green-300 ${mapping.is_new ? 'bg-green-100 dark:bg-green-950/30' : 'bg-white dark:bg-gray-900'} ${mapping.has_changes ? 'border-orange-500 dark:border-orange-400' : ''}`}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Label className="font-medium text-foreground">UTM Source:</Label>
                              <code className="bg-muted px-3 py-1.5 rounded-md text-sm font-mono text-foreground border">
                                {mapping.source}
                              </code>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800">
                                UTM-Based
                              </Badge>
                              {mapping.is_new && <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Auto-Detected</Badge>}
                              {mapping.has_changes && !mapping.is_new && <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">Modified</Badge>}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`category-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">Business Category</Label>
                              <Select 
                                value={mapping.source_category}
                                onValueChange={(value) => updateMapping(mapping.source, mapping.source_type, 'source_category', value)}
                              >
                                <SelectTrigger id={`category-${mapping.source}-${mapping.source_type}`} className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.name} value={cat.name}>
                                      <div className="py-1">
                                        <div className="font-medium text-foreground">{cat.display_name}</div>
                                        {cat.description && <div className="text-xs text-muted-foreground mt-0.5">{cat.description}</div>}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`specific-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">Specific Source</Label>
                              <Input
                                id={`specific-${mapping.source}-${mapping.source_type}`}
                                value={mapping.specific_source || ''}
                                onChange={(e) => updateMapping(mapping.source, mapping.source_type, 'specific_source', e.target.value)}
                                placeholder="e.g., Instagram Ads, Facebook Campaign"
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor={`desc-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">Description</Label>
                              <Textarea
                                id={`desc-${mapping.source}-${mapping.source_type}`}
                                value={mapping.description || ''}
                                onChange={(e) => updateMapping(mapping.source, mapping.source_type, 'description', e.target.value)}
                                placeholder="Optional notes about this traffic source"
                                rows={4}
                                className="w-full resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center space-x-3">
                                <Switch
                                  id={`active-${mapping.source}-${mapping.source_type}`}
                                  checked={mapping.is_active}
                                  onCheckedChange={(checked) => updateMapping(mapping.source, mapping.source_type, 'is_active', checked)}
                                />
                                <Label htmlFor={`active-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">
                                  {mapping.is_active ? 'Active' : 'Inactive'}
                                </Label>
                              </div>

                              <Button
                                size="sm"
                                onClick={() => saveMapping(mapping)}
                                disabled={!mapping.has_changes || saving}
                                className="min-w-[80px]"
                              >
                                {saving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Attribution Details for UTM */}
                        {mapping.attribution_details && (
                          <Card className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                UTM Attribution Data
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {mapping.attribution_details.utm_source && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">UTM Source</Label>
                                    <div className="font-medium text-foreground">{mapping.attribution_details.utm_source}</div>
                                  </div>
                                )}
                                {mapping.attribution_details.utm_medium && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">UTM Medium</Label>
                                    <div className="font-medium text-foreground">{mapping.attribution_details.utm_medium}</div>
                                  </div>
                                )}
                                {mapping.attribution_details.campaigns && mapping.attribution_details.campaigns.length > 0 && (
                                  <div className="md:col-span-2">
                                    <Label className="text-xs text-muted-foreground">Sample Campaigns</Label>
                                    <div className="font-medium text-foreground">{mapping.attribution_details.campaigns.slice(0, 3).join(', ')}</div>
                                  </div>
                                )}
                              </div>

                              {/* Campaign Performance Metrics */}
                              {mapping.attribution_details?.campaign_performance && (
                                <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
                                  <Label className="text-xs text-muted-foreground">Performance Metrics</Label>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                    <div className="text-center">
                                      <div className="text-lg font-semibold text-foreground">
                                        {mapping.attribution_details.campaign_performance.total_leads}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Total Leads</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-semibold text-foreground">
                                        {mapping.attribution_details.campaign_performance.high_value_leads}
                                      </div>
                                      <div className="text-xs text-muted-foreground">High Value</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-semibold text-foreground">
                                        {mapping.attribution_details.campaign_performance.conversion_rate}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Conversion</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-semibold text-foreground">
                                        {mapping.attribution_details.campaign_performance.attribution_confidence}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Confidence</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Customer Journey for UTM */}
                        {mapping.funnel_journey && mapping.funnel_journey.length > 0 && (
                          <Card className="mt-4 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Customer Journey
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                                {mapping.funnel_journey.map((step, index) => (
                                  <div key={index} className="flex items-center space-x-2 flex-shrink-0">
                                    <Badge variant="outline" className="whitespace-nowrap text-foreground">
                                      {step.step}
                                    </Badge>
                                    {index < mapping.funnel_journey!.length - 1 && (
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Legacy Sources (Cleanup Needed) */}
            {mappings.filter(m => !m.is_recommended).length > 0 && (
              <Card className="shadow-sm border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl text-foreground flex items-center gap-2">
                    🧹 Legacy Sources (Cleanup Recommended)
                  </CardTitle>
                  <CardDescription className="text-base">
                    Form-based sources provide limited attribution value. Consider using UTM parameters instead.
                  </CardDescription>
                </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  {mappings.map((mapping) => (
                    <Card 
                      key={`${mapping.source}-${mapping.source_type}`}
                      className={`p-6 ${mapping.is_new ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-400' : ''} ${mapping.has_changes ? 'border-orange-500 dark:border-orange-400' : ''}`}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Label className="font-medium text-foreground">Source:</Label>
                            <code className="bg-muted px-3 py-1.5 rounded-md text-sm font-mono text-foreground border">
                              {mapping.source}
                            </code>
                            <Badge variant="outline" className={mapping.source_type === 'ghl' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800'}>
                              {mapping.source_type === 'ghl' ? 'GHL' : 'Contact'}
                            </Badge>
                            {mapping.is_new && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">New</Badge>}
                            {mapping.has_changes && !mapping.is_new && <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">Modified</Badge>}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`category-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">Business Category</Label>
                            <Select 
                              value={mapping.source_category}
                              onValueChange={(value) => updateMapping(mapping.source, mapping.source_type, 'source_category', value)}
                            >
                              <SelectTrigger id={`category-${mapping.source}-${mapping.source_type}`} className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.name} value={cat.name}>
                                    <div className="py-1">
                                      <div className="font-medium text-foreground">{cat.display_name}</div>
                                      {cat.description && <div className="text-xs text-muted-foreground mt-0.5">{cat.description}</div>}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`specific-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">Specific Source</Label>
                            <Input
                              id={`specific-${mapping.source}-${mapping.source_type}`}
                              value={mapping.specific_source || ''}
                              onChange={(e) => updateMapping(mapping.source, mapping.source_type, 'specific_source', e.target.value)}
                              placeholder="e.g., VSL Landing Page, Facebook Campaign XYZ"
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`desc-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">Description</Label>
                            <Textarea
                              id={`desc-${mapping.source}-${mapping.source_type}`}
                              value={mapping.description || ''}
                              onChange={(e) => updateMapping(mapping.source, mapping.source_type, 'description', e.target.value)}
                              placeholder="Optional notes about this source"
                              rows={4}
                              className="w-full resize-none"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center space-x-3">
                              <Switch
                                id={`active-${mapping.source}-${mapping.source_type}`}
                                checked={mapping.is_active}
                                onCheckedChange={(checked) => updateMapping(mapping.source, mapping.source_type, 'is_active', checked)}
                              />
                              <Label htmlFor={`active-${mapping.source}-${mapping.source_type}`} className="text-sm font-medium text-foreground">
                                {mapping.is_active ? 'Active' : 'Inactive'}
                              </Label>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => saveMapping(mapping)}
                              disabled={!mapping.has_changes || saving}
                              className="min-w-[80px]"
                            >
                              {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Attribution Details */}
                      {(mapping.attribution_details?.utm_campaign || mapping.attribution_details?.fbclid || mapping.attribution_details?.landing_url) && (
                        <Card className="mt-4 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Attribution Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {mapping.attribution_details?.utm_campaign && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Campaign</Label>
                                  <div className="font-medium text-foreground">{mapping.attribution_details.utm_campaign}</div>
                                </div>
                              )}
                              {mapping.attribution_details?.utm_source && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">UTM Source</Label>
                                  <div className="font-medium text-foreground">{mapping.attribution_details.utm_source}</div>
                                </div>
                              )}
                              {mapping.attribution_details?.utm_medium && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">UTM Medium</Label>
                                  <div className="font-medium text-foreground">{mapping.attribution_details.utm_medium}</div>
                                </div>
                              )}
                              {mapping.attribution_details?.session_source && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">Session Source</Label>
                                  <div className="font-medium text-foreground">{mapping.attribution_details.session_source}</div>
                                </div>
                              )}
                              {mapping.attribution_details?.fbclid && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Facebook Click ID</Label>
                                  <div className="font-mono text-xs bg-muted px-2 py-1 rounded border text-foreground break-all">
                                    {mapping.attribution_details.fbclid.substring(0, 50)}...
                                  </div>
                                </div>
                              )}
                              {mapping.attribution_details?.landing_url && (
                                <div className="md:col-span-2">
                                  <Label className="text-xs text-muted-foreground">Landing URL</Label>
                                  <div className="flex items-center gap-2">
                                    <div className="font-mono text-xs bg-muted px-2 py-1 rounded border text-foreground flex-1 truncate">
                                      {mapping.attribution_details.landing_url}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => window.open(mapping.attribution_details?.landing_url, '_blank')}
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Campaign Performance Metrics */}
                            {mapping.attribution_details?.campaign_performance && (
                              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <Label className="text-xs text-muted-foreground">Campaign Performance</Label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                  <div className="text-center">
                                    <div className="text-lg font-semibold text-foreground">
                                      {mapping.attribution_details.campaign_performance.total_leads}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Total Leads</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-semibold text-foreground">
                                      {mapping.attribution_details.campaign_performance.high_value_leads}
                                    </div>
                                    <div className="text-xs text-muted-foreground">High Value</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-semibold text-foreground">
                                      {mapping.attribution_details.campaign_performance.conversion_rate}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Conversion</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-lg font-semibold text-foreground">
                                      {mapping.attribution_details.campaign_performance.attribution_confidence}
                                    </div>
                                    <div className="text-xs text-muted-foreground">Confidence</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Customer Journey Visualization */}
                      {mapping.funnel_journey && mapping.funnel_journey.length > 0 && (
                        <Card className="mt-4 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Customer Journey
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                              {mapping.funnel_journey.map((step, index) => (
                                <div key={index} className="flex items-center space-x-2 flex-shrink-0">
                                  <Badge variant="outline" className="whitespace-nowrap text-foreground">
                                    {step.step}
                                  </Badge>
                                  {index < mapping.funnel_journey!.length - 1 && (
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </Card>
                  ))}
                </div>

                {mappings.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="max-w-md mx-auto">
                      <p className="text-lg">No sources detected yet.</p>
                      <p className="mt-2">Sources will appear here as your system receives appointments and discoveries.</p>
                    </div>
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