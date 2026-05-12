-- Kantana Billing ERP cloud database
-- Run this in Supabase SQL Editor after creating a project.

create table if not exists public.app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

drop policy if exists "Users can read their own app state" on public.app_states;
create policy "Users can read their own app state"
on public.app_states
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own app state" on public.app_states;
create policy "Users can insert their own app state"
on public.app_states
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own app state" on public.app_states;
create policy "Users can update their own app state"
on public.app_states
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.touch_app_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_app_state_updated_at on public.app_states;
create trigger touch_app_state_updated_at
before update on public.app_states
for each row
execute function public.touch_app_state_updated_at();
