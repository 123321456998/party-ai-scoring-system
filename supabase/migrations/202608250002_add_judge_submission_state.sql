-- Record the formal submission time for each anonymous judge identity.
-- Resetting the event deletes anonymous_judges and naturally clears this state.
alter table public.anonymous_judges
  add column if not exists submitted_at timestamptz;
