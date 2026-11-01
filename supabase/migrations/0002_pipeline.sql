-- Reel pipeline: stored media references, AI usage, geocode cache and upload bucket.

alter table public.reels
  add column media_path text,
  add column media_url text,
  add column attempts integer not null default 0,
  add column updated_at timestamptz not null default now();

-- Reels are written by the server only. People can read and remove their own.
drop policy "Manage own reels" on public.reels;
create policy "Read own reels" on public.reels
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Delete own reels" on public.reels
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke insert, update on public.reels from authenticated;

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  -- Kept after account deletion so the spending total stays accurate.
  user_id uuid references auth.users (id) on delete set null,
  reel_id uuid references public.reels (id) on delete set null,
  kind text not null check (kind in ('extract', 'search', 'ask')),
  model text not null,
  input_tokens integer not null,
  cached_tokens integer not null,
  output_tokens integer not null,
  search_queries integer not null,
  cost_usd numeric(12, 6) not null,
  created_at timestamptz not null default now()
);

create index ai_usage_user_created_idx on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
create policy "Read own usage" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.ai_usage from authenticated;

-- Server-only. Nominatim's policy requires caching results.
create table public.geocode_cache (
  query text primary key,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);
alter table public.geocode_cache enable row level security;

-- Server-only spending total, used by the budget stop.
create function public.ai_spent_usd()
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(cost_usd), 0) from public.ai_usage;
$$;
revoke execute on function public.ai_spent_usd() from public, anon, authenticated;
grant execute on function public.ai_spent_usd() to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reel-uploads', 'reel-uploads', false, 50000000, array['video/mp4'])
on conflict (id) do nothing;
