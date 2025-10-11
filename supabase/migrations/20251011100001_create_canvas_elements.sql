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

