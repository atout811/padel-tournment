create or replace function public.get_shared_tournament(
  p_tournament_id uuid,
  p_score_token text
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  tournament_data jsonb;
begin
  if p_tournament_id is null or nullif(p_score_token, '') is null then
    raise exception 'Invalid shared tournament request' using errcode = '42501';
  end if;

  select coalesce(data, '{}'::jsonb) || jsonb_build_object('id', id::text, 'ownerId', owner_id::text)
  into tournament_data
  from public.tournaments
  where id = p_tournament_id
    and score_token_hash = public.hash_score_token(p_score_token);

  if tournament_data is null then
    raise exception 'Invalid shared tournament token' using errcode = '42501';
  end if;

  return tournament_data - 'scoreToken';
end;
$$;

revoke all on function public.get_shared_tournament(uuid, text) from public;
grant execute on function public.get_shared_tournament(uuid, text) to anon, authenticated;

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
  existing_data jsonb;
  updated_data jsonb;
begin
  if p_tournament_id is null or nullif(p_score_token, '') is null or p_tournament_data is null then
    raise exception 'Invalid shared tournament update request' using errcode = '42501';
  end if;

  select data
  into existing_data
  from public.tournaments
  where id = p_tournament_id
    and score_token_hash = public.hash_score_token(p_score_token);

  if existing_data is null then
    raise exception 'Invalid shared tournament token' using errcode = '42501';
  end if;

  if coalesce(existing_data->>'status', '') = 'ended' then
    raise exception 'Tournament is closed' using errcode = '42501';
  end if;

  if coalesce(existing_data->>'id', '') is distinct from coalesce(p_tournament_data->>'id', '')
    or coalesce(existing_data->>'ownerId', '') is distinct from coalesce(p_tournament_data->>'ownerId', '')
    or coalesce(existing_data->>'status', '') is distinct from coalesce(p_tournament_data->>'status', '')
    or coalesce(existing_data->>'endedAt', '') is distinct from coalesce(p_tournament_data->>'endedAt', '') then
    raise exception 'Only the tournament owner can change the tournament lifecycle' using errcode = '42501';
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

  return updated_data - 'scoreToken';
end;
$$;

revoke all on function public.update_shared_tournament_score(uuid, text, jsonb) from public;
grant execute on function public.update_shared_tournament_score(uuid, text, jsonb) to anon, authenticated;
