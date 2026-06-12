create table if not exists public.padel_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_players (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.padel_groups(id) on delete cascade,
  name text not null,
  level integer not null check (level between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists group_players_group_lower_name_idx
  on public.group_players (group_id, lower(name));

create table if not exists public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.padel_groups(id) on delete cascade,
  tournament_id uuid null references public.tournaments(id) on delete set null,
  participant_meta jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists padel_groups_owner_id_idx on public.padel_groups(owner_id);
create index if not exists group_players_group_id_idx on public.group_players(group_id);
create index if not exists group_sessions_group_id_idx on public.group_sessions(group_id);
create index if not exists group_sessions_tournament_id_idx on public.group_sessions(tournament_id);

alter table public.padel_groups enable row level security;
alter table public.group_players enable row level security;
alter table public.group_sessions enable row level security;

create or replace function public.request_owner_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif((nullif(current_setting('request.headers', true), '')::json ->> 'x-owner-id'), '')::uuid;
$$;

drop policy if exists "Enable read access for all users" on public.padel_groups;
drop policy if exists "Enable insert for groups with owner" on public.padel_groups;
drop policy if exists "Enable anonymous group updates" on public.padel_groups;
drop policy if exists "Enable anonymous group deletes" on public.padel_groups;
drop policy if exists "Enable owner group reads" on public.padel_groups;
drop policy if exists "Enable owner group inserts" on public.padel_groups;
drop policy if exists "Enable owner group updates" on public.padel_groups;
drop policy if exists "Enable owner group deletes" on public.padel_groups;

create policy "Enable owner group reads"
  on public.padel_groups for select
  using (owner_id = public.request_owner_id());

create policy "Enable owner group inserts"
  on public.padel_groups for insert
  with check (owner_id = public.request_owner_id());

create policy "Enable owner group updates"
  on public.padel_groups for update
  using (owner_id = public.request_owner_id())
  with check (owner_id = public.request_owner_id());

create policy "Enable owner group deletes"
  on public.padel_groups for delete
  using (owner_id = public.request_owner_id());

drop policy if exists "Enable read access for all players" on public.group_players;
drop policy if exists "Enable anonymous player inserts" on public.group_players;
drop policy if exists "Enable anonymous player updates" on public.group_players;
drop policy if exists "Enable anonymous player deletes" on public.group_players;
drop policy if exists "Enable owner player reads" on public.group_players;
drop policy if exists "Enable owner player inserts" on public.group_players;
drop policy if exists "Enable owner player updates" on public.group_players;
drop policy if exists "Enable owner player deletes" on public.group_players;

create policy "Enable owner player reads"
  on public.group_players for select
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));

create policy "Enable owner player inserts"
  on public.group_players for insert
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));

create policy "Enable owner player updates"
  on public.group_players for update
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ))
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));

create policy "Enable owner player deletes"
  on public.group_players for delete
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));

drop policy if exists "Enable read access for all sessions" on public.group_sessions;
drop policy if exists "Enable anonymous session inserts" on public.group_sessions;
drop policy if exists "Enable anonymous session updates" on public.group_sessions;
drop policy if exists "Enable anonymous session deletes" on public.group_sessions;
drop policy if exists "Enable owner session reads" on public.group_sessions;
drop policy if exists "Enable owner session inserts" on public.group_sessions;
drop policy if exists "Enable owner session updates" on public.group_sessions;
drop policy if exists "Enable owner session deletes" on public.group_sessions;

create policy "Enable owner session reads"
  on public.group_sessions for select
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));

create policy "Enable owner session inserts"
  on public.group_sessions for insert
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));

create policy "Enable owner session updates"
  on public.group_sessions for update
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ))
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));

create policy "Enable owner session deletes"
  on public.group_sessions for delete
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and padel_groups.owner_id = public.request_owner_id()
  ));
