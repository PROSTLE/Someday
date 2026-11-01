-- Someday schema. Every table is private to its owner through row-level security.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  instagram_id text unique,
  created_at timestamptz not null default now()
);

create table public.link_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id text unique,
  source_url text,
  caption text,
  note text,
  status text not null default 'received'
    check (status in ('received', 'watching', 'done', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  view text not null default 'notes'
    check (view in ('poster', 'map', 'steps', 'timeline', 'wishlist', 'gallery', 'notes', 'fallback')),
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  list_id uuid references public.lists (id) on delete set null,
  reel_id uuid references public.reels (id) on delete set null,
  title text not null,
  summary text,
  evidence text,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'todo' check (status in ('todo', 'done')),
  needs_review boolean not null default false,
  due_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    to_tsvector('simple', title || ' ' || coalesce(summary, '') || ' ' || coalesce(evidence, ''))
  ) stored
);

create index items_user_status_idx on public.items (user_id, status);
create index items_list_idx on public.items (list_id);
create index items_search_idx on public.items using gin (search);
create index reels_user_created_idx on public.reels (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.link_codes enable row level security;
alter table public.reels enable row level security;
alter table public.lists enable row level security;
alter table public.items enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

-- People can edit their name. Only the server may set instagram_id.
create policy "Update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Read own link codes" on public.link_codes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own link codes" on public.link_codes
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Manage own reels" on public.reels
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Manage own lists" on public.lists
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Manage own items" on public.items
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.reels;
