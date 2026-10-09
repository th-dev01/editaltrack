create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/Fortaleza',
  default_reminders jsonb not null default '[10080,4320,1440,0]'::jsonb
    check (jsonb_typeof(default_reminders) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

create policy "Users can select their preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their preferences"
  on public.user_preferences for delete
  using (auth.uid() = user_id);

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();
