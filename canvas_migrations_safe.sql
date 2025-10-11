-- Safe migration - uses IF NOT EXISTS for everything

-- Create canvas_boards table if it doesn't exist
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

-- Create indexes if they don't exist
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_boards_account_id ON public.canvas_boards(account_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_boards_created_by ON public.canvas_boards(created_by);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_boards_parent_board_id ON public.canvas_boards(parent_board_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_boards_sharing_mode ON public.canvas_boards(sharing_mode);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.canvas_boards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can see their own private boards" ON public.canvas_boards;
CREATE POLICY "Users can see their own private boards" ON public.canvas_boards
    FOR SELECT USING (auth.uid() = created_by AND sharing_mode = 'private');

DROP POLICY IF EXISTS "Users can see team boards" ON public.canvas_boards;
CREATE POLICY "Users can see team boards" ON public.canvas_boards
    FOR SELECT USING (
        sharing_mode = 'team' AND 
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can see public boards" ON public.canvas_boards;
CREATE POLICY "Users can see public boards" ON public.canvas_boards
    FOR SELECT USING (
        sharing_mode = 'public' AND
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can see custom boards if allowed" ON public.canvas_boards;
CREATE POLICY "Users can see custom boards if allowed" ON public.canvas_boards
    FOR SELECT USING (sharing_mode = 'custom' AND auth.uid() = ANY(allowed_users));

DROP POLICY IF EXISTS "Users can create boards" ON public.canvas_boards;
CREATE POLICY "Users can create boards" ON public.canvas_boards
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own boards" ON public.canvas_boards;
CREATE POLICY "Users can update their own boards" ON public.canvas_boards
    FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update team/public boards" ON public.canvas_boards;
CREATE POLICY "Admins can update team/public boards" ON public.canvas_boards
    FOR UPDATE USING (
        sharing_mode IN ('team', 'public') AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND account_id = canvas_boards.account_id
            AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can delete their own boards" ON public.canvas_boards;
CREATE POLICY "Users can delete their own boards" ON public.canvas_boards
    FOR DELETE USING (auth.uid() = created_by);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_canvas_boards_updated_at ON public.canvas_boards;
CREATE TRIGGER update_canvas_boards_updated_at BEFORE UPDATE ON public.canvas_boards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create canvas_elements table
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

-- Create indexes
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_elements_board_id ON public.canvas_elements(board_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_elements_type ON public.canvas_elements(type);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_elements_created_by ON public.canvas_elements(created_by);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.canvas_elements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can see elements from accessible boards" ON public.canvas_elements;
CREATE POLICY "Users can see elements from accessible boards" ON public.canvas_elements
    FOR SELECT USING (
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE 
                (sharing_mode = 'private' AND created_by = auth.uid())
                OR (sharing_mode = 'team' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'public' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'custom' AND auth.uid() = ANY(allowed_users))
        )
    );

DROP POLICY IF EXISTS "Users can create elements on accessible boards" ON public.canvas_elements;
CREATE POLICY "Users can create elements on accessible boards" ON public.canvas_elements
    FOR INSERT WITH CHECK (
        auth.uid() = created_by AND
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE 
                (sharing_mode = 'private' AND created_by = auth.uid())
                OR (sharing_mode = 'team' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'public' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'custom' AND auth.uid() = ANY(allowed_users))
        )
    );

DROP POLICY IF EXISTS "Users can update their own elements or board owner elements" ON public.canvas_elements;
CREATE POLICY "Users can update their own elements or board owner elements" ON public.canvas_elements
    FOR UPDATE USING (
        auth.uid() = created_by OR
        board_id IN (SELECT id FROM public.canvas_boards WHERE created_by = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete their own elements or board owner elements" ON public.canvas_elements;
CREATE POLICY "Users can delete their own elements or board owner elements" ON public.canvas_elements
    FOR DELETE USING (
        auth.uid() = created_by OR
        board_id IN (SELECT id FROM public.canvas_boards WHERE created_by = auth.uid())
    );

DROP TRIGGER IF EXISTS update_canvas_elements_updated_at ON public.canvas_elements;
CREATE TRIGGER update_canvas_elements_updated_at BEFORE UPDATE ON public.canvas_elements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create canvas_collaborators table
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

-- Create indexes
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_collaborators_board_id ON public.canvas_collaborators(board_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_collaborators_user_id ON public.canvas_collaborators(user_id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_canvas_collaborators_online_at ON public.canvas_collaborators(online_at);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE public.canvas_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can see collaborators on accessible boards" ON public.canvas_collaborators;
CREATE POLICY "Users can see collaborators on accessible boards" ON public.canvas_collaborators
    FOR SELECT USING (
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE 
                (sharing_mode = 'private' AND created_by = auth.uid())
                OR (sharing_mode = 'team' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'public' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'custom' AND auth.uid() = ANY(allowed_users))
        )
    );

DROP POLICY IF EXISTS "Users can insert their own collaborator record" ON public.canvas_collaborators;
CREATE POLICY "Users can insert their own collaborator record" ON public.canvas_collaborators
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE 
                (sharing_mode = 'private' AND created_by = auth.uid())
                OR (sharing_mode = 'team' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'public' AND account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid()))
                OR (sharing_mode = 'custom' AND auth.uid() = ANY(allowed_users))
        )
    );

DROP POLICY IF EXISTS "Users can update their own collaborator record" ON public.canvas_collaborators;
CREATE POLICY "Users can update their own collaborator record" ON public.canvas_collaborators
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own collaborator record" ON public.canvas_collaborators;
CREATE POLICY "Users can delete their own collaborator record" ON public.canvas_collaborators
    FOR DELETE USING (auth.uid() = user_id);

-- Function to clean up stale collaborators
CREATE OR REPLACE FUNCTION public.cleanup_stale_collaborators()
RETURNS void AS $$
BEGIN
    DELETE FROM public.canvas_collaborators
    WHERE online_at < (timezone('utc'::text, now()) - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
