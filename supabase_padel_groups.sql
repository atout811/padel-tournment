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
  tournament_id uuid null,
  participant_meta jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists padel_groups_owner_id_idx on public.padel_groups(owner_id);
create index if not exists group_players_group_id_idx on public.group_players(group_id);
create index if not exists group_sessions_group_id_idx on public.group_sessions(group_id);
create index if not exists group_sessions_tournament_id_idx on public.group_sessions(tournament_id);
