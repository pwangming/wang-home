-- supabase/migrations/001_initial_schema.sql

-- Enable extension for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  username_normalized text not null unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Game sessions table
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid not null unique default gen_random_uuid(),
  score integer not null check (score >= 0),
  speed_multiplier numeric(4,2) not null check (speed_multiplier > 0),
  score_multiplier numeric(4,2) not null check (score_multiplier > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  submit_source text,
  is_verified boolean not null default false,
  verification_reason text,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for leaderboard queries
create index if not exists idx_game_sessions_user_id on public.game_sessions(user_id);
create index if not exists idx_game_sessions_score on public.game_sessions(score desc);
create index if not exists idx_game_sessions_verified_score on public.game_sessions(is_verified, score desc);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;

-- Profiles: publicly readable, users can update own
create policy "profiles are publicly readable" on public.profiles
  for select using (true);
create policy "profiles can be inserted by owner" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles can be updated by owner" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile when auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  raw_username text;
  normalized_username text;
  final_username text;
begin
  raw_username := coalesce(new.raw_user_meta_data->>'username', 'player_' || left(replace(new.id::text, '-', ''), 12));
  normalized_username := lower(regexp_replace(trim(raw_username), '[^a-zA-Z0-9_]', '', 'g'));
  if normalized_username = '' then
    normalized_username := 'player_' || left(replace(new.id::text, '-', ''), 12);
  end if;
  final_username := normalized_username;

  insert into public.profiles (id, username, username_normalized)
  values (
    new.id,
    final_username,
    normalized_username
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Game sessions: users can only read/insert their own
create policy "users can insert own sessions" on public.game_sessions
  for insert with check (auth.uid() = user_id);
create policy "users can read own sessions" on public.game_sessions
  for select using (auth.uid() = user_id);
create policy "users can finalize own pending sessions" on public.game_sessions
  for update using (auth.uid() = user_id and ended_at is null and is_verified = false)
  with check (auth.uid() = user_id);

-- Realtime event table (用于触发排行榜刷新，不暴露原始战绩)
create table if not exists public.leaderboard_events (
  id bigserial primary key,
  created_at timestamptz not null default now()
);
alter table public.leaderboard_events enable row level security;
create policy "leaderboard events are publicly readable" on public.leaderboard_events
  for select using (true);

create or replace function public.notify_leaderboard_refresh()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.leaderboard_events default values;
  return null;
end;
$$;

revoke all on function public.notify_leaderboard_refresh() from public;
revoke all on function public.notify_leaderboard_refresh() from anon;
revoke all on function public.notify_leaderboard_refresh() from authenticated;

drop trigger if exists trg_notify_leaderboard_refresh on public.game_sessions;
create trigger trg_notify_leaderboard_refresh
after update on public.game_sessions
for each row
when (old.is_verified = false and new.is_verified = true)
execute function public.notify_leaderboard_refresh();

-- Leaderboard view (best score per user)
create or replace view public.leaderboard_best as
with ranked as (
  select
    gs.user_id,
    gs.score as best_score,
    gs.played_at as best_score_at,
    row_number() over (
      partition by gs.user_id
      order by gs.score desc, gs.played_at asc, gs.id asc
    ) as rn
  from public.game_sessions gs
  where gs.is_verified = true
)
select
  r.user_id,
  p.username,
  p.avatar_url,
  r.best_score,
  r.best_score_at
from ranked r
join public.profiles p on p.id = r.user_id
where r.rn = 1
order by r.best_score desc, r.best_score_at asc, r.user_id asc;

-- Add realtime publication target
do $$
begin
  alter publication supabase_realtime add table public.leaderboard_events;
exception
  when duplicate_object then null;
end $$;
