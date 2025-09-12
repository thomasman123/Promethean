-- Add missing sales_rep_user_id column to dials table
-- This column is needed to track the sales rep when an appointment is booked from a dial

ALTER TABLE public.dials 
ADD COLUMN sales_rep_user_id UUID REFERENCES public.profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_dials_sales_rep_user_id ON public.dials(sales_rep_user_id);

-- Update RLS policies if needed (dials table should already have proper policies)

COMMENT ON COLUMN public.dials.sales_rep_user_id IS 'References the sales rep user when an appointment is booked from this dial'; 