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

