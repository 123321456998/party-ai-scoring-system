-- Edge Functions use the service_role database role for server-side workflows.
-- RLS remains enabled; these grants do not expose the tables to browser clients.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.events to service_role;
grant select, insert, update, delete on public.teams to service_role;
grant select, insert, update, delete on public.anonymous_judges to service_role;
grant select, insert, update, delete on public.judge_sessions to service_role;
grant select, insert, update, delete on public.scores to service_role;
grant select, insert, update, delete on public.final_results to service_role;
grant select, insert, update, delete on public.admin_sessions to service_role;
