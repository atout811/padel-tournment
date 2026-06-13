create or replace function public.request_owner_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif((nullif(current_setting('request.headers', true), '')::json ->> 'x-owner-id'), '')::uuid;
$$;

create or replace function public.matches_owner_id(target_owner_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select target_owner_id = auth.uid()
    or target_owner_id = public.request_owner_id();
$$;

drop policy if exists "Enable owner group reads" on public.padel_groups;
drop policy if exists "Enable owner group inserts" on public.padel_groups;
drop policy if exists "Enable owner group updates" on public.padel_groups;
drop policy if exists "Enable owner group deletes" on public.padel_groups;

create policy "Enable owner group reads"
  on public.padel_groups for select
  using (public.matches_owner_id(owner_id));

create policy "Enable owner group inserts"
  on public.padel_groups for insert
  with check (public.matches_owner_id(owner_id));

create policy "Enable owner group updates"
  on public.padel_groups for update
  using (public.matches_owner_id(owner_id))
  with check (public.matches_owner_id(owner_id));

create policy "Enable owner group deletes"
  on public.padel_groups for delete
  using (public.matches_owner_id(owner_id));

drop policy if exists "Enable owner player reads" on public.group_players;
drop policy if exists "Enable owner player inserts" on public.group_players;
drop policy if exists "Enable owner player updates" on public.group_players;
drop policy if exists "Enable owner player deletes" on public.group_players;

create policy "Enable owner player reads"
  on public.group_players for select
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

create policy "Enable owner player inserts"
  on public.group_players for insert
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

create policy "Enable owner player updates"
  on public.group_players for update
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ))
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

create policy "Enable owner player deletes"
  on public.group_players for delete
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_players.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

drop policy if exists "Enable owner session reads" on public.group_sessions;
drop policy if exists "Enable owner session inserts" on public.group_sessions;
drop policy if exists "Enable owner session updates" on public.group_sessions;
drop policy if exists "Enable owner session deletes" on public.group_sessions;

create policy "Enable owner session reads"
  on public.group_sessions for select
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

create policy "Enable owner session inserts"
  on public.group_sessions for insert
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

create policy "Enable owner session updates"
  on public.group_sessions for update
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ))
  with check (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

create policy "Enable owner session deletes"
  on public.group_sessions for delete
  using (exists (
    select 1 from public.padel_groups
    where padel_groups.id = group_sessions.group_id
      and public.matches_owner_id(padel_groups.owner_id)
  ));

drop policy if exists "Enable insert for users based on user_id" on public.tournaments;
drop policy if exists "Enable owner tournament deletes" on public.tournaments;
drop policy if exists "allow anonymous updates" on public.tournaments;

create policy "Enable owner tournament inserts"
  on public.tournaments for insert
  with check (public.matches_owner_id(owner_id));

create policy "Enable owner tournament updates"
  on public.tournaments for update
  using (public.matches_owner_id(owner_id))
  with check (public.matches_owner_id(owner_id));

create policy "Enable owner tournament deletes"
  on public.tournaments for delete
  using (public.matches_owner_id(owner_id));
