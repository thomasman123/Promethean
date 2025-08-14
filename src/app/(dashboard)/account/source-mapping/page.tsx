'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Plus, Save, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface SourceMapping {
  id?: string;
  ghl_source: string;
  source_category: string;
  specific_source?: string;
  description?: string;
  is_active: boolean;
  is_new?: boolean;
  has_changes?: boolean;
}

interface SourceCategory {
  name: string;
  display_name: string;
  description: string;
}

export default function SourceMappingPage() {
  const [mappings, setMappings] = useState<SourceMapping[]>([]);
  const [categories, setCategories] = useState<SourceCategory[]>([]);
  const [unmappedSources, setUnmappedSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get user's account
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile?.account_id) return;

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('source_categories')
        .select('*')
        .order('display_name');

      setCategories(categoriesData || []);

      // Fetch existing mappings
      const { data: mappingsData } = await supabase
        .from('ghl_source_mappings')
        .select('*')
        .eq('account_id', profile.account_id)
        .order('ghl_source');

      setMappings(mappingsData || []);

      // Fetch unmapped sources
      const { data: unmappedData } = await supabase
        .rpc('get_unmapped_sources', { p_account_id: profile.account_id });

      setUnmappedSources(unmappedData?.map((u: any) => u.ghl_source) || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load source mappings');
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (ghlSource: string, field: string, value: any) => {
    setMappings(prev => prev.map(m => 
      m.ghl_source === ghlSource 
        ? { ...m, [field]: value, has_changes: true }
        : m
    ));
  };

  const saveMapping = async (mapping: SourceMapping) => {
    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile?.account_id) return;

      const { error } = await supabase
        .from('ghl_source_mappings')
        .upsert({
          ...mapping,
          account_id: profile.account_id,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Source Attribution Mapping</h1>
        <p className="text-muted-foreground mt-2">
          Map GHL sources to your business categories and track detailed attribution
        </p>
      </div>

      {/* Unmapped Sources Alert */}
      {unmappedSources.length > 0 && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>New sources detected:</strong> {unmappedSources.join(', ')}
            <div className="mt-2 flex gap-2">
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

      <div className="grid gap-6">
        {/* Current Mappings */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Source Mappings</CardTitle>
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
              {mappings.map((mapping) => (
                <Card 
                  key={mapping.ghl_source} 
                  className={`p-4 ${mapping.is_new ? 'border-blue-500' : ''} ${mapping.has_changes ? 'border-orange-500' : ''}`}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Label className="font-medium">GHL Source:</Label>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {mapping.ghl_source}
                        </code>
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
                            checked={mapping.is_active}
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

            {mappings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No source mappings configured yet. Add sources from the detected list above or create custom ones.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attribution Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Common Source Mapping Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Discovery Calls</div>
                  <code className="text-xs">manual</code> → <Badge variant="secondary">discovery</Badge> → "Discovery Call Booking"
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Landing Pages</div>
                  <code className="text-xs">funnel</code> → <Badge variant="secondary">funnel</Badge> → "VSL Landing Page"
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Direct Calendar</div>
                  <code className="text-xs">calendar</code> → <Badge variant="secondary">organic</Badge> → "Website Calendar Widget"
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Cold Call Follow-up</div>
                  <code className="text-xs">automation</code> → <Badge variant="secondary">outbound_dial</Badge> → "Cold Call Workflow"
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Paid Ads</div>
                  <code className="text-xs">api</code> → <Badge variant="secondary">paid_ads</Badge> → "Facebook Lead Form"
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Partner Referral</div>
                  <code className="text-xs">manual</code> → <Badge variant="secondary">referral</Badge> → "Partner ABC Referral"
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 