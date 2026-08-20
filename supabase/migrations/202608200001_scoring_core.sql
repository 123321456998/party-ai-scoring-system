create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  name text not null,
  status text not null default 'prepare' check (status in ('prepare', 'scoring', 'locked', 'published')),
  expected_judges integer not null default 0 check (expected_judges >= 0),
  score_min numeric(4,1) not null default 0,
  score_max numeric(4,1) not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_code text not null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(event_id, team_code)
);

create table if not exists public.anonymous_judges (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  recovery_code_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(event_id, recovery_code_hash)
);

create table if not exists public.judge_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  anonymous_judge_id uuid not null references public.anonymous_judges(id) on delete cascade,
  auth_uid uuid not null,
  created_at timestamptz not null default now(),
  unique(event_id, auth_uid),
  unique(event_id, anonymous_judge_id, auth_uid)
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  anonymous_judge_id uuid not null references public.anonymous_judges(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  score numeric(3,1) not null check (score >= 0 and score <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, anonymous_judge_id, team_id)
);

create table if not exists public.final_results (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  average_score numeric(4,2) not null,
  score_count integer not null check (score_count >= 0),
  rank_position integer not null,
  award text not null check (award in ('一等奖', '二等奖', '三等奖')),
  tie boolean not null default false,
  created_at timestamptz not null default now(),
  unique(event_id, team_id)
);

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.anonymous_judges enable row level security;
alter table public.judge_sessions enable row level security;
alter table public.scores enable row level security;
alter table public.final_results enable row level security;
alter table public.admin_sessions enable row level security;

-- 评分端不直接查询这些表，所有匿名码验证和评分读写通过 Edge Functions 完成。
insert into public.events(event_key, name, status, expected_judges, score_min, score_max)
values ('party-ai-business-ai', '党建引领AI业务大赛', 'scoring', 7, 0, 10)
on conflict (event_key) do nothing;

insert into public.teams(event_id, team_code, name)
select e.id, code, code || '队'
from public.events e cross join (values ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) as t(code)
where e.event_key = 'party-ai-business-ai'
on conflict (event_id, team_code) do nothing;
