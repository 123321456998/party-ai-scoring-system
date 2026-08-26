import { adminClient } from '../_shared/auth.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'
import { displayTeamName, sortTeamsForDisplay } from '../_shared/team-display.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { event_key } = await req.json()
    const db = adminClient()
    const { data: event } = await db.from('events').select('id,name,status').eq('event_key', event_key).maybeSingle()
    if (!event) throw new Error('赛事不存在。')
    const { data: teams } = await db.from('teams').select('id,team_code,name').eq('event_id', event.id)
    const teamRows = sortTeamsForDisplay(teams ?? [])
    if (event.status !== 'published') {
      return new Response(JSON.stringify({ eventName: event.name, eventStatus: event.status, teams: teamRows.map((team) => ({ ...team, name: displayTeamName(team) })), results: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { data: results, error } = await db.from('final_results').select('team_id,average_score,score_count,rank_position,award,tie,teams(name,team_code)').eq('event_id', event.id).order('rank_position')
    if (error) throw error
    return new Response(JSON.stringify({ eventName: event.name, eventStatus: event.status, results: (results ?? []).map((result) => ({ teamId: result.team_id, teamName: displayTeamName(result.teams as { name: string; team_code: string }), averageScore: result.average_score, scoreCount: result.score_count, rankPosition: result.rank_position, award: result.award, tie: result.tie })) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '读取失败。' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
