-- The preflight audit confirmed there are no scores or final results above 10.
-- Keep final_results.average_score unchanged at numeric(5,2) for 10.00 and averages such as 9.33.
alter table public.events
  alter column score_max set default 10;

alter table public.scores
  drop constraint if exists scores_score_check;

alter table public.scores
  add constraint scores_score_check
  check (score >= 0 and score <= 10 and score = trunc(score));

update public.events
set score_min = 0,
    score_max = 10,
    updated_at = now()
where event_key = 'party-ai-business-ai';
