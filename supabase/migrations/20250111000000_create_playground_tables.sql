-- Create playground tables for tldraw-based canvas with widgets

-- Playground boards (one per account)
CREATE TABLE IF NOT EXISTS playground_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Board',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id) -- Ensure one board per account
);

-- Playground pages (multiple per board)
CREATE TABLE IF NOT EXISTS playground_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES playground_boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled Page',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playground page content (stores tldraw document + widget configs)
CREATE TABLE IF NOT EXISTS playground_page_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES playground_pages(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(page_id) -- One content record per page
);

-- Enable RLS
ALTER TABLE playground_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE playground_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE playground_page_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for playground_boards
-- Users can view boards for accounts they have access to
CREATE POLICY "Users can view their account boards"
  ON playground_boards FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_access
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can create boards for accounts they have admin/moderator access to
CREATE POLICY "Users can create boards for their accounts"
  ON playground_boards FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_access
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
        AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update boards for accounts they have access to
CREATE POLICY "Users can update their account boards"
  ON playground_boards FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id FROM account_access
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
        AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete boards for accounts they have admin access to
CREATE POLICY "Users can delete their account boards"
  ON playground_boards FOR DELETE
  USING (
    account_id IN (
      SELECT account_id FROM account_access
      WHERE user_id = auth.uid() 
        AND role = 'admin'
        AND is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for playground_pages
-- Users can view pages if they can view the board
CREATE POLICY "Users can view pages from accessible boards"
  ON playground_pages FOR SELECT
  USING (
    board_id IN (
      SELECT id FROM playground_boards
      WHERE account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Users can create pages if they have access to the board
CREATE POLICY "Users can create pages in accessible boards"
  ON playground_pages FOR INSERT
  WITH CHECK (
    board_id IN (
      SELECT id FROM playground_boards
      WHERE account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() 
          AND role IN ('admin', 'moderator')
          AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Users can update pages in accessible boards
CREATE POLICY "Users can update pages in accessible boards"
  ON playground_pages FOR UPDATE
  USING (
    board_id IN (
      SELECT id FROM playground_boards
      WHERE account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() 
          AND role IN ('admin', 'moderator')
          AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Users can delete pages from accessible boards
CREATE POLICY "Users can delete pages from accessible boards"
  ON playground_pages FOR DELETE
  USING (
    board_id IN (
      SELECT id FROM playground_boards
      WHERE account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() 
          AND role IN ('admin', 'moderator')
          AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- RLS Policies for playground_page_content
-- Users can view content if they can view the page
CREATE POLICY "Users can view content from accessible pages"
  ON playground_page_content FOR SELECT
  USING (
    page_id IN (
      SELECT pp.id FROM playground_pages pp
      JOIN playground_boards pb ON pp.board_id = pb.id
      WHERE pb.account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Users can create content for accessible pages
CREATE POLICY "Users can create content in accessible pages"
  ON playground_page_content FOR INSERT
  WITH CHECK (
    page_id IN (
      SELECT pp.id FROM playground_pages pp
      JOIN playground_boards pb ON pp.board_id = pb.id
      WHERE pb.account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() 
          AND role IN ('admin', 'moderator')
          AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Users can update content in accessible pages
CREATE POLICY "Users can update content in accessible pages"
  ON playground_page_content FOR UPDATE
  USING (
    page_id IN (
      SELECT pp.id FROM playground_pages pp
      JOIN playground_boards pb ON pp.board_id = pb.id
      WHERE pb.account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() 
          AND role IN ('admin', 'moderator')
          AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Users can delete content from accessible pages
CREATE POLICY "Users can delete content from accessible pages"
  ON playground_page_content FOR DELETE
  USING (
    page_id IN (
      SELECT pp.id FROM playground_pages pp
      JOIN playground_boards pb ON pp.board_id = pb.id
      WHERE pb.account_id IN (
        SELECT account_id FROM account_access
        WHERE user_id = auth.uid() 
          AND role IN ('admin', 'moderator')
          AND is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_playground_boards_account_id ON playground_boards(account_id);
CREATE INDEX idx_playground_pages_board_id ON playground_pages(board_id);
CREATE INDEX idx_playground_pages_order ON playground_pages("order");
CREATE INDEX idx_playground_page_content_page_id ON playground_page_content(page_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_playground_boards_updated_at
  BEFORE UPDATE ON playground_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playground_pages_updated_at
  BEFORE UPDATE ON playground_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playground_page_content_updated_at
  BEFORE UPDATE ON playground_page_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

