-- Expand the score range without deleting or rewriting existing score rows.
alter table public.scores
  alter column score type numeric(5,2) using score;

alter table public.scores
  drop constraint if exists scores_score_check;

alter table public.scores
  add constraint scores_score_check check (score >= 0 and score <= 100);

update public.events
set score_min = 0,
    score_max = 100,
    updated_at = now()
where event_key = 'party-ai-business-ai';
