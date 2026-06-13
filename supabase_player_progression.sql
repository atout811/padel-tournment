alter table public.group_players
  add column if not exists initial_level integer not null default 3,
  add column if not exists rating integer not null default 1000,
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
