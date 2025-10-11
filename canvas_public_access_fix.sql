-- Fix: Allow unauthenticated users to view public boards and their elements

-- Add policy for public boards viewable by anyone (even unauthenticated)
DROP POLICY IF EXISTS "Anyone can see public boards" ON public.canvas_boards;
CREATE POLICY "Anyone can see public boards" ON public.canvas_boards
    FOR SELECT
    USING (sharing_mode = 'public');

-- Add policy for public board elements viewable by anyone (even unauthenticated)
DROP POLICY IF EXISTS "Anyone can see elements from public boards" ON public.canvas_elements;
CREATE POLICY "Anyone can see elements from public boards" ON public.canvas_elements
    FOR SELECT
    USING (
        board_id IN (
            SELECT id FROM public.canvas_boards
            WHERE sharing_mode = 'public'
        )
    );

