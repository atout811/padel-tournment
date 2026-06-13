alter table public.tournaments
  add column if not exists score_token_hash text;

drop policy if exists "Allow shared tournament updates" on public.tournaments;

create or replace function public.hash_score_token(token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(token, 'sha256'), 'hex');
$$;

create or replace function public.update_shared_tournament_score(
  p_tournament_id uuid,
  p_score_token text,
  p_tournament_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  updated_data jsonb;
begin
  if p_tournament_id is null or nullif(p_score_token, '') is null or p_tournament_data is null then
    raise exception 'Invalid shared tournament update request' using errcode = '42501';
  end if;

  update public.tournaments
  set
    data = p_tournament_data - 'scoreToken',
    updated_at = now()
  where id = p_tournament_id
    and score_token_hash = public.hash_score_token(p_score_token)
  returning data into updated_data;

  if updated_data is null then
    raise exception 'Invalid shared tournament token' using errcode = '42501';
  end if;

  return updated_data;
end;
$$;

revoke all on function public.update_shared_tournament_score(uuid, text, jsonb) from public;
grant execute on function public.update_shared_tournament_score(uuid, text, jsonb) to anon, authenticated;
