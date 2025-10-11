-- Create canvas_boards table for storing interactive canvas/board pages
CREATE TABLE IF NOT EXISTS public.canvas_boards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sharing_mode TEXT NOT NULL CHECK (sharing_mode IN ('private', 'team', 'public', 'custom')) DEFAULT 'private',
    allowed_users UUID[] DEFAULT '{}',
    parent_board_id UUID REFERENCES public.canvas_boards(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    icon TEXT DEFAULT '📋',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_canvas_boards_account_id ON public.canvas_boards(account_id);
CREATE INDEX idx_canvas_boards_created_by ON public.canvas_boards(created_by);
CREATE INDEX idx_canvas_boards_parent_board_id ON public.canvas_boards(parent_board_id);
CREATE INDEX idx_canvas_boards_sharing_mode ON public.canvas_boards(sharing_mode);

-- Enable RLS
ALTER TABLE public.canvas_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can see their own private boards
CREATE POLICY "Users can see their own private boards" ON public.canvas_boards
    FOR SELECT
    USING (
        auth.uid() = created_by AND sharing_mode = 'private'
    );

-- Users can see team boards if they belong to the same account
CREATE POLICY "Users can see team boards" ON public.canvas_boards
    FOR SELECT
    USING (
        sharing_mode = 'team' AND 
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can see public boards from their account
CREATE POLICY "Users can see public boards" ON public.canvas_boards
    FOR SELECT
    USING (
        sharing_mode = 'public' AND
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can see custom boards if they're in allowed_users
CREATE POLICY "Users can see custom boards if allowed" ON public.canvas_boards
    FOR SELECT
    USING (
        sharing_mode = 'custom' AND
        auth.uid() = ANY(allowed_users)
    );

-- Users can create boards for their account
CREATE POLICY "Users can create boards" ON public.canvas_boards
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND
        account_id IN (
            SELECT account_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Users can update their own boards
CREATE POLICY "Users can update their own boards" ON public.canvas_boards
    FOR UPDATE
    USING (
        auth.uid() = created_by
    );

-- Admins can update team/public boards
CREATE POLICY "Admins can update team/public boards" ON public.canvas_boards
    FOR UPDATE
    USING (
        sharing_mode IN ('team', 'public') AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND account_id = canvas_boards.account_id
            AND role = 'admin'
        )
    );

-- Users can delete their own boards
CREATE POLICY "Users can delete their own boards" ON public.canvas_boards
    FOR DELETE
    USING (
        auth.uid() = created_by
    );

-- Create trigger for updated_at
CREATE TRIGGER update_canvas_boards_updated_at BEFORE UPDATE ON public.canvas_boards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create canvas_elements table for storing shapes, arrows, text, widgets on boards
CREATE TABLE IF NOT EXISTS public.canvas_elements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES public.canvas_boards(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('shape', 'arrow', 'text', 'widget', 'sticky-note')),
    element_data JSONB NOT NULL DEFAULT '{}',
    widget_config JSONB,
    position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
    size JSONB DEFAULT '{"width": 100, "height": 100}',
    style JSONB DEFAULT '{}',
    z_index INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_canvas_elements_board_id ON public.canvas_elements(board_id);
CREATE INDEX idx_canvas_elements_type ON public.canvas_elements(type);
CREATE INDEX idx_canvas_elements_created_by ON public.canvas_elements(created_by);

-- Enable RLS
ALTER TABLE public.canvas_elements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can see elements from boards they have access to
CREATE POLICY "Users can see elements from accessible boards" ON public.canvas_elements
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

-- Users can create elements on boards they have access to
CREATE POLICY "Users can create elements on accessible boards" ON public.canvas_elements
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND
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

-- Users can update elements they created or on boards they own
CREATE POLICY "Users can update their own elements or board owner elements" ON public.canvas_elements
    FOR UPDATE
    USING (
        auth.uid() = created_by OR
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE created_by = auth.uid()
        )
    );

-- Users can delete elements they created or on boards they own
CREATE POLICY "Users can delete their own elements or board owner elements" ON public.canvas_elements
    FOR DELETE
    USING (
        auth.uid() = created_by OR
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE created_by = auth.uid()
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_canvas_elements_updated_at BEFORE UPDATE ON public.canvas_elements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

