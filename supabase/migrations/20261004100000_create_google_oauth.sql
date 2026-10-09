create table public.google_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create index google_oauth_states_expiration_idx on public.google_oauth_states (expires_at);

create table public.google_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  google_email text,
  google_user_id text,
  refresh_token_encrypted text not null,
  access_token_encrypted text null,
  expires_at timestamptz null,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth_states enable row level security;
alter table public.google_calendar_connections enable row level security;

-- Deliberately no client policies: state and encrypted tokens are accessed only by Edge Functions.
create trigger google_calendar_connections_updated_at
  before update on public.google_calendar_connections
  for each row execute function public.set_updated_at();

create or replace function public.consume_google_oauth_state(p_state_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed_user_id uuid;
begin
  update public.google_oauth_states
     set used_at = now()
   where state_hash = p_state_hash
     and used_at is null
     and expires_at > now()
  returning user_id into consumed_user_id;

  return consumed_user_id;
end;
$$;

revoke all on function public.consume_google_oauth_state(text) from public, anon, authenticated;
grant execute on function public.consume_google_oauth_state(text) to service_role;

grant all on public.google_oauth_states, public.google_calendar_connections to service_role;
