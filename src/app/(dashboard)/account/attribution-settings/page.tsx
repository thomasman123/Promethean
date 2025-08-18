'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Save, Settings, CheckCircle, XCircle, Edit } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
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

interface AttributionSettings {
  auto_attribution_enabled: boolean;
  auto_create_utm_mappings: boolean;
  require_manual_approval: boolean;
  auto_confidence_threshold: 'high' | 'medium' | 'low';
}

interface PendingMapping {
  id: string;
  utm_source: string;
  utm_medium: string;
  source_category: string;
  specific_source: string;
  description: string;
  confidence_level: string;
  usage_count: number;
  sample_campaigns: string[];
  created_at: string;
}

export default function AttributionSettingsPage() {
  const { user, loading, getAccountBasedPermissions, selectedAccountId } = useAuth();
  const permissions = getAccountBasedPermissions();
  const router = useRouter();
  const [settings, setSettings] = useState<AttributionSettings>({
    auto_attribution_enabled: true,
    auto_create_utm_mappings: true,
    require_manual_approval: false,
    auto_confidence_threshold: 'medium'
  });
  const [pendingMappings, setPendingMappings] = useState<PendingMapping[]>([]);
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
      
      // Fetch current settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('account_attribution_settings')
        .select('*')
        .eq('account_id', selectedAccountId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      if (settingsData) {
        setSettings({
          auto_attribution_enabled: settingsData.auto_attribution_enabled,
          auto_create_utm_mappings: settingsData.auto_create_utm_mappings,
          require_manual_approval: settingsData.require_manual_approval,
          auto_confidence_threshold: settingsData.auto_confidence_threshold
        });
      }

      // Fetch pending mappings
      const { data: pendingData, error: pendingError } = await supabase
        .rpc('get_pending_attribution_mappings', { p_account_id: selectedAccountId });

      if (pendingError) throw pendingError;
      setPendingMappings(pendingData || []);
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load attribution settings');
    } finally {
      setDataLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!selectedAccountId) return;
    
    try {
      setSaving(true);

      const { error } = await supabase
        .rpc('update_attribution_settings', {
          p_account_id: selectedAccountId,
          p_auto_attribution_enabled: settings.auto_attribution_enabled,
          p_auto_create_utm_mappings: settings.auto_create_utm_mappings,
          p_require_manual_approval: settings.require_manual_approval,
          p_auto_confidence_threshold: settings.auto_confidence_threshold
        });

      if (error) throw error;

      toast.success('Attribution settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleMappingAction = async (mappingId: string, action: 'approve' | 'reject' | 'modify') => {
    if (!selectedAccountId) return;
    
    try {
      const { error } = await supabase
        .rpc('manage_auto_mapping', {
          p_account_id: selectedAccountId,
          p_mapping_id: mappingId,
          p_action: action
        });

      if (error) throw error;

      // Refresh pending mappings
      fetchData();
      toast.success(`Mapping ${action}d successfully`);
    } catch (error) {
      console.error(`Failed to ${action} mapping:`, error);
      toast.error(`Failed to ${action} mapping`);
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
                : 'You need moderator permissions to access attribution settings.'
              }
            </p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      {/* Header removed; global PageHeader in layout handles top bar */}

      <div className="container mx-auto p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Attribution Settings</h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Configure automatic UTM-based attribution for your account
          </p>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-3">Loading settings...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Attribution Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Automatic Attribution
                </CardTitle>
                <CardDescription>
                  Control how the system automatically categorizes traffic sources
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Enable Automatic Attribution</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically classify leads based on UTM parameters
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_attribution_enabled}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, auto_attribution_enabled: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Auto-Create UTM Mappings</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create source mappings for new UTM combinations
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_create_utm_mappings}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, auto_create_utm_mappings: checked }))
                    }
                    disabled={!settings.auto_attribution_enabled}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Require Manual Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Review auto-created mappings before they become active
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_manual_approval}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, require_manual_approval: checked }))
                    }
                    disabled={!settings.auto_create_utm_mappings || !settings.auto_attribution_enabled}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Auto-Creation Confidence Threshold</Label>
                  <Select
                    value={settings.auto_confidence_threshold}
                    onValueChange={(value: 'high' | 'medium' | 'low') => 
                      setSettings(prev => ({ ...prev, auto_confidence_threshold: value }))
                    }
                    disabled={!settings.auto_create_utm_mappings || !settings.auto_attribution_enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High - Only obvious patterns (ig+ppc, fb+ppc)</SelectItem>
                      <SelectItem value="medium">Medium - Most recognizable patterns</SelectItem>
                      <SelectItem value="low">Low - Any UTM combination</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Higher thresholds create fewer, more accurate mappings
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={saveSettings} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Settings
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pending Mappings */}
            {pendingMappings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approval</CardTitle>
                  <CardDescription>
                    Auto-created mappings waiting for your review
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingMappings.map((mapping) => (
                      <Card key={mapping.id} className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {mapping.utm_source || 'null'} + {mapping.utm_medium || 'null'}
                                </Badge>
                                <Badge variant="secondary">
                                  {mapping.confidence_level} confidence
                                </Badge>
                              </div>
                              <p className="font-medium">{mapping.specific_source}</p>
                              <p className="text-sm text-muted-foreground">{mapping.description}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>{mapping.usage_count} leads</span>
                                {mapping.sample_campaigns.length > 0 && (
                                  <span>Campaigns: {mapping.sample_campaigns.slice(0, 2).join(', ')}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMappingAction(mapping.id, 'approve')}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMappingAction(mapping.id, 'reject')}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Info */}
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                <strong>How it works:</strong> When new leads come in with UTM parameters, the system will automatically classify them based on your settings. 
                {settings.auto_attribution_enabled 
                  ? settings.auto_create_utm_mappings
                    ? settings.require_manual_approval
                      ? ' New mappings will be created and sent for your approval.'
                      : ' New mappings will be created automatically.'
                    : ' Existing mappings will be used, new ones require manual creation.'
                  : ' All classification will be done manually through the source mapping page.'
                }
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </SidebarInset>
  );
} 