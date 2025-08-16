'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2, Edit, Save, X, TestTube } from 'lucide-react'

interface UTMRule {
  id: string
  rule_name: string
  utm_source_pattern: string | null
  utm_medium_pattern: string | null
  utm_campaign_pattern: string | null
  source_category: string
  specific_source: string
  description: string | null
  priority: number
  is_pattern_match: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SourceCategory {
  name: string
  description: string
  color: string
  icon: string
}

interface TestResult {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  usage_count: number
  matched_rule: string | null
  proposed_category: string | null
  proposed_source: string | null
}

// Form shape for creating/editing rules in this UI
type NewRuleForm = {
  rule_name: string
  utm_source_pattern: string
  utm_medium_pattern: string
  utm_campaign_pattern: string
  source_category: string
  specific_source: string
  description: string
  priority: number
  is_pattern_match: boolean
  is_active: boolean
}

export default function UTMRulesPage() {
  const { user, loading: authLoading, selectedAccountId, getAccountBasedPermissions } = useAuth()
  const router = useRouter()
  
  const [rules, setRules] = useState<UTMRule[]>([])
  const [categories, setCategories] = useState<SourceCategory[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [showNewRule, setShowNewRule] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestedSources, setSuggestedSources] = useState<string[]>([])
  const [suggestedMediums, setSuggestedMediums] = useState<string[]>([])
  const [suggestedCampaigns, setSuggestedCampaigns] = useState<string[]>([])

  const permissions = getAccountBasedPermissions()

  const [newRule, setNewRule] = useState<NewRuleForm>({
    rule_name: '',
    utm_source_pattern: '',
    utm_medium_pattern: '',
    utm_campaign_pattern: '',
    source_category: '',
    specific_source: '',
    description: '',
    priority: 100,
    is_pattern_match: false,
    is_active: true
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (!permissions.canManageAccount) {
      router.replace('/dashboard')
      return
    }
    if (selectedAccountId) {
      loadData()
    } else {
      setError('No account found')
      setLoading(false)
    }
  }, [authLoading, user, permissions.canManageAccount, selectedAccountId, router])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!selectedAccountId) {
        throw new Error('No account found')
      }

      // Load source categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('source_categories')
        .select('*')
        .order('name')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      // Load UTM rules
      const { data: rulesData, error: rulesError } = await supabase
        .rpc('get_account_utm_rules', { p_account_id: selectedAccountId })

      if (rulesError) throw rulesError
      setRules(rulesData || [])

      // Load observed unmapped UTM combinations to power suggestions
      const { data: combos } = await supabase
        .rpc('get_unmapped_utm_combinations', { p_account_id: selectedAccountId })

      const toSortedUnique = (values: (string | null | undefined)[]) => {
        const counts = new Map<string, number>()
        values.filter(Boolean).forEach(v => {
          const key = String(v).trim()
          if (!key) return
          counts.set(key, (counts.get(key) || 0) + 1)
        })
        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([k]) => k)
      }

      const srcs = toSortedUnique((combos || []).map((c: any) => c.utm_source))
      const meds = toSortedUnique((combos || []).map((c: any) => c.utm_medium))
      const camps = toSortedUnique((combos || []).map((c: any) => c.utm_campaign))

      setSuggestedSources(srcs.slice(0, 12))
      setSuggestedMediums(meds.slice(0, 12))
      setSuggestedCampaigns(camps.slice(0, 12))

    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const testRules = async () => {
    if (!selectedAccountId) return

    try {
      setTesting(true)
      setError(null)

      const { data, error } = await supabase
        .rpc('test_utm_rule_coverage', { p_account_id: selectedAccountId })

      if (error) throw error
      setTestResults(data || [])

    } catch (err) {
      console.error('Error testing rules:', err)
      setError(err instanceof Error ? err.message : 'Failed to test rules')
    } finally {
      setTesting(false)
    }
  }

  const saveRule = async (rule: Partial<UTMRule>) => {
    if (!selectedAccountId) return

    try {
      setSaving(true)
      setError(null)

      const ruleData = {
        account_id: selectedAccountId,
        rule_name: rule.rule_name,
        utm_source_pattern: rule.utm_source_pattern || null,
        utm_medium_pattern: rule.utm_medium_pattern || null,
        utm_campaign_pattern: rule.utm_campaign_pattern || null,
        source_category: rule.source_category,
        specific_source: rule.specific_source,
        description: rule.description || null,
        priority: rule.priority || 100,
        is_pattern_match: rule.is_pattern_match || false,
        is_active: rule.is_active !== false,
        updated_at: new Date().toISOString()
      }

      if (rule.id) {
        // Update existing rule
        const { error } = await supabase
          .from('account_utm_rules')
          .update(ruleData)
          .eq('id', rule.id)

        if (error) throw error
      } else {
        // Create new rule
        const { error } = await supabase
          .from('account_utm_rules')
          .insert(ruleData)

        if (error) throw error
      }

      await loadData()
      setEditingRule(null)
      setShowNewRule(false)
      resetNewRule()

    } catch (err) {
      console.error('Error saving rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const deleteRule = async (ruleId: string) => {
    try {
      setSaving(true)
      setError(null)

      const { error } = await supabase
        .from('account_utm_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      await loadData()

    } catch (err) {
      console.error('Error deleting rule:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    } finally {
      setSaving(false)
    }
  }

  const resetNewRule = () => {
    setNewRule({
      rule_name: '',
      utm_source_pattern: '',
      utm_medium_pattern: '',
      utm_campaign_pattern: '',
      source_category: '',
      specific_source: '',
      description: '',
      priority: 100,
      is_pattern_match: false,
      is_active: true
    })
  }

  if (loading) {
    return <div className="p-6">Loading UTM rules...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">UTM Interpretation Rules</h1>
        <p className="text-muted-foreground">
          Define how your account interprets UTM parameters for accurate source attribution
        </p>
      </div>

      {error && (
        <Alert className="border-destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">Manage Rules</TabsTrigger>
          <TabsTrigger value="test">Test Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Current Rules</h2>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowNewRule(true)}
                disabled={showNewRule}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>

          {showNewRule && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle>Create New UTM Rule</CardTitle>
                <CardDescription>
                  Define how specific UTM patterns should be interpreted
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuickTemplates onApply={(tpl) => setNewRule(r => ({ ...r, ...tpl }))} />
                <RuleForm
                  rule={newRule}
                  categories={categories}
                  onSave={(rule) => saveRule(rule)}
                  onCancel={() => {
                    setShowNewRule(false)
                    resetNewRule()
                  }}
                  saving={saving}
                  suggestedSources={suggestedSources}
                  suggestedMediums={suggestedMediums}
                  suggestedCampaigns={suggestedCampaigns}
                />
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? 'opacity-50' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {rule.rule_name}
                        {!rule.is_active && <Badge variant="secondary">Inactive</Badge>}
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                      </CardTitle>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
                      >
                        {editingRule === rule.id ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {editingRule === rule.id ? (
                    <RuleForm
                      rule={rule}
                      categories={categories}
                      onSave={(updatedRule) => saveRule({ ...rule, ...updatedRule })}
                      onCancel={() => setEditingRule(null)}
                      saving={saving}
                      suggestedSources={suggestedSources}
                      suggestedMediums={suggestedMediums}
                      suggestedCampaigns={suggestedCampaigns}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">UTM Source</Label>
                          <div className="font-mono">{rule.utm_source_pattern || 'Any'}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">UTM Medium</Label>
                          <div className="font-mono">{rule.utm_medium_pattern || 'Any'}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">UTM Campaign</Label>
                          <div className="font-mono">{rule.utm_campaign_pattern || 'Any'}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Pattern Match</Label>
                          <div>{rule.is_pattern_match ? 'Yes' : 'Exact'}</div>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Maps to</Label>
                            <div className="font-medium">{rule.source_category} → {rule.specific_source}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {rules.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  No UTM rules defined yet. Create your first rule to start automatic attribution.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Test Rule Coverage</h2>
            <Button onClick={testRules} disabled={testing}>
              <TestTube className="w-4 h-4 mr-2" />
              {testing ? 'Testing...' : 'Test Rules'}
            </Button>
          </div>

          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>UTM Coverage Analysis</CardTitle>
                <CardDescription>
                  Shows how your current rules would classify actual UTM data from your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded">
                      <div className="space-y-1">
                        <div className="font-mono text-sm">
                          {result.utm_source || 'null'} / {result.utm_medium || 'null'}
                          {result.utm_campaign && ` / ${result.utm_campaign}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {result.usage_count} occurrences
                        </div>
                      </div>
                      <div className="text-right">
                        {result.matched_rule ? (
                          <div className="space-y-1">
                            <Badge variant="default">{result.matched_rule}</Badge>
                            <div className="text-sm">{result.proposed_category} → {result.proposed_source}</div>
                          </div>
                        ) : (
                          <Badge variant="secondary">No Rule Match</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function QuickTemplates({ onApply }: { onApply: (tpl: Partial<NewRuleForm>) => void }) {
  const apply = (tpl: Partial<NewRuleForm>) => onApply(tpl)
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => apply({ rule_name: 'Facebook Ads', utm_source_pattern: 'fb', utm_medium_pattern: 'ppc', specific_source: 'Facebook Ads', is_pattern_match: false })}>Facebook Ads</Button>
      <Button variant="outline" size="sm" onClick={() => apply({ rule_name: 'Instagram Ads', utm_source_pattern: 'ig', utm_medium_pattern: 'ppc', specific_source: 'Instagram Ads', is_pattern_match: false })}>Instagram Ads</Button>
      <Button variant="outline" size="sm" onClick={() => apply({ rule_name: 'Google Ads', utm_source_pattern: 'google', utm_medium_pattern: 'cpc', specific_source: 'Google Ads', is_pattern_match: false })}>Google Ads</Button>
    </div>
  )
}

interface RuleFormProps {
  rule: Partial<UTMRule>
  categories: SourceCategory[]
  onSave: (rule: Partial<UTMRule>) => void
  onCancel: () => void
  saving: boolean
  suggestedSources?: string[]
  suggestedMediums?: string[]
  suggestedCampaigns?: string[]
}

function RuleForm({ rule, categories, onSave, onCancel, saving, suggestedSources = [], suggestedMediums = [], suggestedCampaigns = [] }: RuleFormProps) {
  const [formData, setFormData] = useState(rule)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const ChipRow = ({ values, onPick }: { values: string[]; onPick: (v: string) => void }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {values.slice(0, 10).map((v) => (
        <Button key={v} type="button" size="sm" variant="secondary" onClick={() => onPick(v)}>{v}</Button>
      ))}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rule_name">Rule Name *</Label>
          <Input
            id="rule_name"
            value={formData.rule_name || ''}
            onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
            placeholder="e.g., Facebook Ads Rule"
            required
          />
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            value={formData.priority || 100}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            placeholder="100"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="utm_source_pattern">UTM Source Pattern</Label>
          <Input
            id="utm_source_pattern"
            value={formData.utm_source_pattern || ''}
            onChange={(e) => setFormData({ ...formData, utm_source_pattern: e.target.value })}
            placeholder="e.g., fb, ig, google"
          />
          <ChipRow values={suggestedSources} onPick={(v) => setFormData({ ...formData, utm_source_pattern: v })} />
        </div>
        <div>
          <Label htmlFor="utm_medium_pattern">UTM Medium Pattern</Label>
          <Input
            id="utm_medium_pattern"
            value={formData.utm_medium_pattern || ''}
            onChange={(e) => setFormData({ ...formData, utm_medium_pattern: e.target.value })}
            placeholder="e.g., ppc, cpc, social"
          />
          <ChipRow values={suggestedMediums} onPick={(v) => setFormData({ ...formData, utm_medium_pattern: v })} />
        </div>
        <div>
          <Label htmlFor="utm_campaign_pattern">UTM Campaign Pattern (Optional)</Label>
          <Input
            id="utm_campaign_pattern"
            value={formData.utm_campaign_pattern || ''}
            onChange={(e) => setFormData({ ...formData, utm_campaign_pattern: e.target.value })}
            placeholder="e.g., %brand%"
          />
          <ChipRow values={suggestedCampaigns} onPick={(v) => setFormData({ ...formData, utm_campaign_pattern: v })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="source_category">Source Category *</Label>
          <Select
            value={formData.source_category || ''}
            onValueChange={(value) => setFormData({ ...formData, source_category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.icon} {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="specific_source">Specific Source *</Label>
          <Input
            id="specific_source"
            value={formData.specific_source || ''}
            onChange={(e) => setFormData({ ...formData, specific_source: e.target.value })}
            placeholder="e.g., Facebook Ads, Google Ads"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe when this rule should apply"
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_pattern_match"
            checked={formData.is_pattern_match || false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_pattern_match: checked })}
          />
          <Label htmlFor="is_pattern_match">Use pattern matching (LIKE)</Label>
        </div>
        <div className="text-xs text-muted-foreground">Use % as a wildcard. Example: %fb% matches facebook/meta variants.</div>
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active !== false}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Active</Label>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Rule'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
} 