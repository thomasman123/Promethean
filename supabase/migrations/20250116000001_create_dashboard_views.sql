-- Create dashboard views table
CREATE TABLE IF NOT EXISTS public.dashboard_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('private', 'team', 'global')) DEFAULT 'private',
    notes TEXT,
    filters JSONB NOT NULL DEFAULT '{}',
    widgets JSONB NOT NULL DEFAULT '[]',
    compare_mode BOOLEAN DEFAULT FALSE,
    compare_entities JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX idx_dashboard_views_account_id ON public.dashboard_views(account_id);
CREATE INDEX idx_dashboard_views_created_by ON public.dashboard_views(created_by);
CREATE INDEX idx_dashboard_views_scope ON public.dashboard_views(scope);

-- Enable RLS
ALTER TABLE public.dashboard_views ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can see their own private views
CREATE POLICY "Users can see their own private views" ON public.dashboard_views
    FOR SELECT
    USING (
        auth.uid() = created_by AND scope = 'private'
    );

-- Users can see team views if they belong to the same account
CREATE POLICY "Users can see team views" ON public.dashboard_views
    FOR SELECT
    USING (
        scope = 'team' AND 
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can see global views from their account
CREATE POLICY "Users can see global views" ON public.dashboard_views
    FOR SELECT
    USING (
        scope = 'global' AND
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can create views for their account
CREATE POLICY "Users can create views" ON public.dashboard_views
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can update their own views
CREATE POLICY "Users can update their own views" ON public.dashboard_views
    FOR UPDATE
    USING (
        auth.uid() = created_by
    );

-- Admins can update team/global views
CREATE POLICY "Admins can update team/global views" ON public.dashboard_views
    FOR UPDATE
    USING (
        scope IN ('team', 'global') AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND account_id = dashboard_views.account_id
            AND role IN ('admin', 'super_admin')
        )
    );

-- Users can delete their own views
CREATE POLICY "Users can delete their own views" ON public.dashboard_views
    FOR DELETE
    USING (
        auth.uid() = created_by
    );

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_views_updated_at BEFORE UPDATE ON public.dashboard_views
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create default starter views function
CREATE OR REPLACE FUNCTION public.create_default_views(p_account_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Owner Overview
    INSERT INTO public.dashboard_views (name, account_id, created_by, scope, notes, is_default, widgets)
    VALUES (
        'Owner Overview',
        p_account_id,
        p_user_id,
        'global',
        'High-level metrics for business owners',
        true,
        '[
            {"id": "1", "metricName": "revenue_total", "breakdown": "total", "vizType": "kpi", "position": {"x": 0, "y": 0}, "size": {"w": 3, "h": 2}},
            {"id": "2", "metricName": "appointments_total", "breakdown": "total", "vizType": "kpi", "position": {"x": 3, "y": 0}, "size": {"w": 3, "h": 2}},
            {"id": "3", "metricName": "close_rate", "breakdown": "total", "vizType": "kpi", "position": {"x": 6, "y": 0}, "size": {"w": 3, "h": 2}},
            {"id": "4", "metricName": "revenue_total", "breakdown": "time", "vizType": "line", "position": {"x": 0, "y": 2}, "size": {"w": 6, "h": 4}},
            {"id": "5", "metricName": "appointments_total", "breakdown": "rep", "vizType": "bar", "position": {"x": 6, "y": 2}, "size": {"w": 6, "h": 4}}
        ]'::jsonb
    );

    -- Sales Manager Dashboard
    INSERT INTO public.dashboard_views (name, account_id, created_by, scope, notes, is_default, widgets)
    VALUES (
        'Sales Manager',
        p_account_id,
        p_user_id,
        'global',
        'Team performance metrics for sales managers',
        true,
        '[
            {"id": "1", "metricName": "appointments_total", "breakdown": "rep", "vizType": "bar", "position": {"x": 0, "y": 0}, "size": {"w": 6, "h": 4}},
            {"id": "2", "metricName": "show_rate", "breakdown": "rep", "vizType": "bar", "position": {"x": 6, "y": 0}, "size": {"w": 6, "h": 4}},
            {"id": "3", "metricName": "close_rate", "breakdown": "rep", "vizType": "bar", "position": {"x": 0, "y": 4}, "size": {"w": 6, "h": 4}},
            {"id": "4", "metricName": "revenue_per_appointment", "breakdown": "rep", "vizType": "table", "position": {"x": 6, "y": 4}, "size": {"w": 6, "h": 4}}
        ]'::jsonb
    );

    -- Rep Scorecard
    INSERT INTO public.dashboard_views (name, account_id, created_by, scope, notes, is_default, widgets)
    VALUES (
        'Rep Scorecard',
        p_account_id,
        p_user_id,
        'global',
        'Individual rep performance metrics',
        true,
        '[
            {"id": "1", "metricName": "appointments_today", "breakdown": "total", "vizType": "kpi", "position": {"x": 0, "y": 0}, "size": {"w": 3, "h": 2}},
            {"id": "2", "metricName": "revenue_mtd", "breakdown": "total", "vizType": "kpi", "position": {"x": 3, "y": 0}, "size": {"w": 3, "h": 2}},
            {"id": "3", "metricName": "close_rate", "breakdown": "total", "vizType": "kpi", "position": {"x": 6, "y": 0}, "size": {"w": 3, "h": 2}},
            {"id": "4", "metricName": "appointments_total", "breakdown": "time", "vizType": "line", "position": {"x": 0, "y": 2}, "size": {"w": 12, "h": 4}}
        ]'::jsonb
    );
END;
$$ LANGUAGE plpgsql; 