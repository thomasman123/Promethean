-- Create canvas_collaborators table for real-time collaboration tracking
CREATE TABLE IF NOT EXISTS public.canvas_collaborators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES public.canvas_boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cursor_position JSONB DEFAULT '{"x": 0, "y": 0}',
    current_selection UUID[] DEFAULT '{}',
    online_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    color TEXT NOT NULL,
    user_name TEXT,
    UNIQUE(board_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_canvas_collaborators_board_id ON public.canvas_collaborators(board_id);
CREATE INDEX idx_canvas_collaborators_user_id ON public.canvas_collaborators(user_id);
CREATE INDEX idx_canvas_collaborators_online_at ON public.canvas_collaborators(online_at);

-- Enable RLS
ALTER TABLE public.canvas_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can see collaborators on boards they have access to
CREATE POLICY "Users can see collaborators on accessible boards" ON public.canvas_collaborators
    FOR SELECT
    USING (
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE 
                (sharing_mode = 'private' AND created_by = auth.uid())
                OR (sharing_mode = 'team' AND account_id IN (
                    SELECT account_id FROM public.profiles WHERE id = auth.uid()
                ))
                OR (sharing_mode = 'public' AND account_id IN (
                    SELECT account_id FROM public.profiles WHERE id = auth.uid()
                ))
                OR (sharing_mode = 'custom' AND auth.uid() = ANY(allowed_users))
        )
    );

-- Users can insert their own collaborator record
CREATE POLICY "Users can insert their own collaborator record" ON public.canvas_collaborators
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE 
                (sharing_mode = 'private' AND created_by = auth.uid())
                OR (sharing_mode = 'team' AND account_id IN (
                    SELECT account_id FROM public.profiles WHERE id = auth.uid()
                ))
                OR (sharing_mode = 'public' AND account_id IN (
                    SELECT account_id FROM public.profiles WHERE id = auth.uid()
                ))
                OR (sharing_mode = 'custom' AND auth.uid() = ANY(allowed_users))
        )
    );

-- Users can update their own collaborator record
CREATE POLICY "Users can update their own collaborator record" ON public.canvas_collaborators
    FOR UPDATE
    USING (
        auth.uid() = user_id
    );

-- Users can delete their own collaborator record
CREATE POLICY "Users can delete their own collaborator record" ON public.canvas_collaborators
    FOR DELETE
    USING (
        auth.uid() = user_id
    );

-- Function to clean up stale collaborators (offline for more than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_stale_collaborators()
RETURNS void AS $$
BEGIN
    DELETE FROM public.canvas_collaborators
    WHERE online_at < (timezone('utc'::text, now()) - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

