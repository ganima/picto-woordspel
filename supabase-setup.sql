-- Picto Woordspel: database setup for Supabase (version 2: roles, themes, games).
-- Before running this: create YOUR OWN login under Authentication > Users > Add user > Create new user.
-- Every login that exists when you run this script becomes an admin.
-- Then paste this whole file into the SQL Editor and press Run. It is safe to run again.

-- 0. Remove the tables of the first version, if they exist (they hold no real data yet) ---

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'themes' and column_name = 'active') then
    drop table public.themes cascade;
  end if;
end $$;
drop table if exists public.words cascade;
drop table if exists public.teachers cascade;
drop policy if exists "media teacher insert" on storage.objects;
drop policy if exists "media teacher update" on storage.objects;
drop policy if exists "media teacher delete" on storage.objects;
drop function if exists public.is_teacher();

-- 1. Staff: who is admin and who is juf. Children have no login. ----------------

create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'juf')),
  email text not null default '',
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.my_role()
returns text language sql stable security definer set search_path = ''
as $$ select role from public.staff where user_id = (select auth.uid()) $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = (select auth.uid())) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = (select auth.uid()) and role = 'admin') $$;

-- An admin gives an existing login a role, by email address.
create or replace function public.add_staff(p_email text, p_role text)
returns public.staff language plpgsql security definer set search_path = ''
as $$
declare
  u uuid;
  r public.staff;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can add staff.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'juf') then
    raise exception 'Unknown role: %', p_role using errcode = '22023';
  end if;
  select id into u from auth.users where lower(email) = lower(trim(p_email));
  if u is null then
    raise exception 'There is no login with this email address yet. Create it first under Authentication > Users.' using errcode = 'P0002';
  end if;
  insert into public.staff (user_id, role, email)
  values (u, p_role, lower(trim(p_email)))
  on conflict (user_id) do update set role = excluded.role
  returning * into r;
  return r;
end $$;

-- 2. Themes and their pictos ------------------------------------------------------

create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  visible boolean not null default false,   -- on: children can choose it in the theme menu
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.theme_items (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.themes (id) on delete cascade,
  word text not null default '',
  picto_path text not null,
  audio_path text,                           -- the juf's recording
  options jsonb not null default '{}',       -- per item settings, e.g. {"exclude": ["shadow"]}
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists theme_items_theme_sort on public.theme_items (theme_id, sort);

-- 3. Games ------------------------------------------------------------------------
-- The games themselves live in the app's code; this table says which ones the class gets.
-- key matches the game's folder in the code.

create table if not exists public.games (
  key text primary key,
  kind text not null check (kind in ('theme', 'standalone')),
  available boolean not null default true,   -- admin: the game exists for this school
  visible boolean not null default true,     -- juf: her class sees it in the game menu
  sort integer not null default 0,
  settings jsonb not null default '{}'
);

insert into public.games (key, kind, sort) values
  ('shadow', 'theme', 1),
  ('same',   'theme', 2),
  ('listen', 'theme', 3),
  ('dress',  'standalone', 4)
on conflict (key) do nothing;

-- Content for standalone games, e.g. one dressing-up set: a figure, clothes, where each piece goes.
create table if not exists public.game_sets (
  id uuid primary key default gen_random_uuid(),
  game_key text not null references public.games (key) on delete cascade,
  name text not null default '',
  visible boolean not null default false,
  data jsonb not null default '{}',
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_sets_game on public.game_sets (game_key, sort);

-- A juf may switch games on and off for her class, but only an admin decides which games exist.
create or replace function public.games_guard()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if (new.available is distinct from old.available or new.kind is distinct from old.kind or new.key is distinct from old.key)
     and not public.is_admin() then
    raise exception 'Only an admin can change which games are available.' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists games_guard on public.games;
create trigger games_guard before update on public.games for each row execute function public.games_guard();

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists themes_touch on public.themes;
create trigger themes_touch before update on public.themes for each row execute function public.touch_updated_at();
drop trigger if exists game_sets_touch on public.game_sets;
create trigger game_sets_touch before update on public.game_sets for each row execute function public.touch_updated_at();

-- 4. Access rules -------------------------------------------------------------------
-- Children (no login): see only visible themes, available and visible games, visible game sets.
-- Juf and admin: see and change everything except the list of staff and which games exist.
-- Admin: also manages staff and game availability.

alter table public.staff enable row level security;
alter table public.themes enable row level security;
alter table public.theme_items enable row level security;
alter table public.games enable row level security;
alter table public.game_sets enable row level security;

grant select on public.themes, public.theme_items, public.games, public.game_sets to anon, authenticated;
grant insert, update, delete on public.themes, public.theme_items, public.game_sets to authenticated;
grant insert, update, delete on public.games to authenticated;
grant select, update, delete on public.staff to authenticated;
grant execute on function public.my_role(), public.is_staff(), public.is_admin() to anon, authenticated;
revoke execute on function public.add_staff(text, text) from public, anon;
grant execute on function public.add_staff(text, text) to authenticated;

drop policy if exists "staff read" on public.staff;
create policy "staff read" on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "staff admin update" on public.staff;
create policy "staff admin update" on public.staff for update to authenticated
  using (public.is_admin() and user_id <> (select auth.uid())) with check (public.is_admin());
drop policy if exists "staff admin delete" on public.staff;
create policy "staff admin delete" on public.staff for delete to authenticated
  using (public.is_admin() and user_id <> (select auth.uid()));

drop policy if exists "themes read" on public.themes;
create policy "themes read" on public.themes for select to anon, authenticated
  using (visible or public.is_staff());
drop policy if exists "themes staff write" on public.themes;
create policy "themes staff write" on public.themes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "items read" on public.theme_items;
create policy "items read" on public.theme_items for select to anon, authenticated
  using (public.is_staff() or exists (select 1 from public.themes t where t.id = theme_id and t.visible));
drop policy if exists "items staff write" on public.theme_items;
create policy "items staff write" on public.theme_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "games read" on public.games;
create policy "games read" on public.games for select to anon, authenticated
  using ((available and visible) or public.is_staff());
drop policy if exists "games staff update" on public.games;
create policy "games staff update" on public.games for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "games admin insert" on public.games;
create policy "games admin insert" on public.games for insert to authenticated
  with check (public.is_admin());
drop policy if exists "games admin delete" on public.games;
create policy "games admin delete" on public.games for delete to authenticated
  using (public.is_admin());

drop policy if exists "sets read" on public.game_sets;
create policy "sets read" on public.game_sets for select to anon, authenticated
  using (public.is_staff() or (visible and exists (select 1 from public.games g where g.key = game_key and g.available and g.visible)));
drop policy if exists "sets staff write" on public.game_sets;
create policy "sets staff write" on public.game_sets for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- 5. File storage for pictos, recordings and game images ----------------------------
-- Files sit under themes/<theme id>/... and games/<set id>/...; the ids are random, so a file
-- can only be opened by someone who already has its address.

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "media read" on storage.objects;
create policy "media read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'media');
drop policy if exists "media staff insert" on storage.objects;
create policy "media staff insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_staff());
drop policy if exists "media staff update" on storage.objects;
create policy "media staff update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_staff()) with check (bucket_id = 'media' and public.is_staff());
drop policy if exists "media staff delete" on storage.objects;
create policy "media staff delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_staff());

-- 6. The logins that exist right now become admin -------------------------------------

insert into public.staff (user_id, role, email)
select id, 'admin', coalesce(email, '') from auth.users
on conflict (user_id) do nothing;
