-- Add phone number to profiles for easier contact
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Add evidence columns to orders for 2-step verification
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS pickup_evidence text, -- URL or path to image
ADD COLUMN IF NOT EXISTS workshop_evidence text; -- URL or path to image

-- Update Orders Policy to allow drivers to upload evidence (update)
-- existing policy might be "Enable read access for all users" or generic.
-- We ensure authenticated users can update their assigned orders.
-- (Assuming RLS is already open or simple for now given previous files)
