-- Preserve every team identity and its score/result relationships.  Only the
-- two current display names for this event are updated; display order remains
-- a stable application mapping because the teams table has no order column.
update public.teams as team
set name = case team.team_code
  when 'E' then '香港公司'
  when 'F' then '物流公司'
  else team.name
end
from public.events as event
where team.event_id = event.id
  and event.event_key = 'party-ai-business-ai'
  and team.team_code in ('E', 'F');
