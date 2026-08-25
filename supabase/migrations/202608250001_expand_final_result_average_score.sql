-- Allow a 100.00 average in the 100-point scoring system without changing existing rows.
alter table public.final_results
  alter column average_score type numeric(5,2)
  using average_score;
