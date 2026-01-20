-- Create the table
create table public.orders (
  id text primary key,
  user_id uuid references auth.users not null,
  user_email text,
  user_name text,
  status text default 'Pending Payment',
  total numeric,
  service text,
  weight numeric,
  items jsonb, -- For Dry Clean items
  schedule text,
  address text,
  location jsonb, -- Lat/Long etc
  driver jsonb, -- Driver details
  productionItems jsonb, -- Production tracking
  productionLogs jsonb, -- Timestamp logs
  productionCount integer, -- Total pieces
  productionNotes text, -- Notes
  evidence boolean default false, -- Upload evidence status
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.orders enable row level security;

-- Policies
create policy "Users can view their own orders"
on public.orders for select
using (auth.uid() = user_id);

create policy "Users can insert their own orders"
on public.orders for insert
with check (auth.uid() = user_id);

-- Allow authenticated users (Merchants/Drivers included in this simple model) to view all
create policy "Authenticated users can view all orders"
on public.orders for select
using ( auth.role() = 'authenticated' );

-- Create Policy: Allow anyone to update status (for Merchant Dashboard simplicity)
create policy "Authenticated users can update orders"
on public.orders for update
using ( auth.role() = 'authenticated' );
