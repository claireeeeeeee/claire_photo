-- Run in Supabase SQL Editor. Replace the UUID in the final INSERT with your Auth user UUID.
create extension if not exists pgcrypto;
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.shoots (
 id uuid primary key default gen_random_uuid(), title text not null, category text,
 start_at timestamptz not null, end_at timestamptz not null,
 location text, address text, people integer default 1 check(people>0),
 payment_note text, notes text, status text not null default 'pending' check(status in ('pending','confirmed','cancelled','completed')),
 code_hash text unique not null, version integer not null default 1,
 confirmed_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
 constraint valid_time check(end_at>start_at)
);
create table if not exists public.shoot_feedback (
 id uuid primary key default gen_random_uuid(), shoot_id uuid not null references public.shoots(id) on delete cascade,
 message text not null check(char_length(message) between 1 and 3000), created_at timestamptz default now()
);
create or replace function public.is_claire_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admins where user_id=(select auth.uid())) $$;
revoke all on function public.is_claire_admin() from public;
grant execute on function public.is_claire_admin() to authenticated;
alter table public.admins enable row level security;
alter table public.shoots enable row level security;
alter table public.shoot_feedback enable row level security;
create policy "admins read own" on public.admins for select to authenticated using (user_id=(select auth.uid()));
create policy "admin read shoots" on public.shoots for select to authenticated using (public.is_claire_admin());
create policy "admin update shoots" on public.shoots for update to authenticated using (public.is_claire_admin()) with check (public.is_claire_admin());
create policy "admin read feedback" on public.shoot_feedback for select to authenticated using (public.is_claire_admin());
-- No public table policies: guests can only use the restricted Edge Function.
-- IMPORTANT: create an Auth user in Authentication > Users, then run separately:
-- insert into public.admins(user_id) values ('YOUR-AUTH-USER-UUID');
