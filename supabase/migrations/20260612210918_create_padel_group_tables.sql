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
  initial_level integer not null default 1 check (initial_level between 1 and 5),
  level integer not null default 1 check (level between 1 and 5),
  rating integer not null default 850 check (rating >= 700),
  matches_played integer not null default 0 check (matches_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  last_played_at timestamptz null,
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
  stats_applied boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.group_players
  add column if not exists initial_level integer not null default 1,
  add column if not exists rating integer not null default 850,
  add column if not exists matches_played integer not null default 0,
  add column if not exists wins integer not null default 0,
  add column if not exists losses integer not null default 0,
  add column if not exists current_streak integer not null default 0,
  add column if not exists best_streak integer not null default 0,
  add column if not exists last_played_at timestamptz null;

alter table public.group_sessions
  add column if not exists stats_applied boolean not null default false;

update public.group_players
set
  level = least(5, greatest(1, coalesce(level, 3))),
  initial_level = least(5, greatest(1, coalesce(initial_level, level, 3))),
  rating = greatest(700, coalesce(rating, 1000)),
  matches_played = greatest(0, coalesce(matches_played, 0)),
  wins = greatest(0, coalesce(wins, 0)),
  losses = greatest(0, coalesce(losses, 0)),
  current_streak = greatest(0, coalesce(current_streak, 0)),
  best_streak = greatest(0, coalesce(best_streak, 0));

update public.group_players
set initial_level = level
where matches_played = 0
  and wins = 0
  and losses = 0
  and initial_level in (1, 3)
  and level between 1 and 5;

update public.group_players
set rating = case initial_level
  when 1 then 850
  when 2 then 950
  when 4 then 1150
  when 5 then 1300
  else 1050
end
where matches_played = 0
  and wins = 0
  and losses = 0
  and rating in (850, 1000);

update public.group_players
set level = case
  when rating < 900 then 1
  when rating < 1000 then 2
  when rating < 1100 then 3
  when rating < 1250 then 4
  else 5
end
where matches_played = 0
  and wins = 0
  and losses = 0;

alter table public.group_players
  alter column initial_level set default 1,
  alter column initial_level set not null,
  alter column level set default 1,
  alter column level set not null,
  alter column rating set default 850,
  alter column rating set not null,
  alter column matches_played set default 0,
  alter column matches_played set not null,
  alter column wins set default 0,
  alter column wins set not null,
  alter column losses set default 0,
  alter column losses set not null,
  alter column current_streak set default 0,
  alter column current_streak set not null,
  alter column best_streak set default 0,
  alter column best_streak set not null;

alter table public.group_sessions
  alter column stats_applied set default false,
  alter column stats_applied set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_initial_level_check') then
    alter table public.group_players add constraint group_players_initial_level_check check (initial_level between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_level_check') then
    alter table public.group_players add constraint group_players_level_check check (level between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_rating_check') then
    alter table public.group_players add constraint group_players_rating_check check (rating >= 700);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_matches_played_check') then
    alter table public.group_players add constraint group_players_matches_played_check check (matches_played >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_wins_check') then
    alter table public.group_players add constraint group_players_wins_check check (wins >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_losses_check') then
    alter table public.group_players add constraint group_players_losses_check check (losses >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_current_streak_check') then
    alter table public.group_players add constraint group_players_current_streak_check check (current_streak >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.group_players'::regclass and conname = 'group_players_best_streak_check') then
    alter table public.group_players add constraint group_players_best_streak_check check (best_streak >= 0);
  end if;
end $$;

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
