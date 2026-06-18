do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'padel_groups'
    ) then
      alter publication supabase_realtime add table public.padel_groups;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'group_players'
    ) then
      alter publication supabase_realtime add table public.group_players;
    end if;
  end if;
end $$;
