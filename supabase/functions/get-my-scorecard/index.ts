import { adminClient, currentAuthUid } from '../_shared/auth.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { event_key } = await req.json(); const db = adminClient(); const authUid = await currentAuthUid(req)
    const { data: event } = await db.from('events').select('id,name,status,score_max').eq('event_key', event_key).eq('status', 'scoring').maybeSingle(); if (!event) throw new Error('赛事不可用。')
    const { data: session } = await db.from('judge_sessions').select('anonymous_judge_id').eq('event_id', event.id).eq('auth_uid', authUid).maybeSingle(); if (!session) throw new Error('匿名身份尚未验证。')
    const { data: judge } = await db.from('anonymous_judges').select('submitted_at,active').eq('id', session.anonymous_judge_id).eq('event_id', event.id).maybeSingle(); if (!judge || !judge.active) throw new Error('匿名评分身份已失效。')
    const [{ data: teams, error: teamsError }, { data: scores, error: scoresError }] = await Promise.all([db.from('teams').select('id,team_code,name').eq('event_id', event.id).eq('active', true).order('team_code'), db.from('scores').select('team_id,score').eq('event_id', event.id).eq('anonymous_judge_id', session.anonymous_judge_id)])
    if (teamsError || scoresError) throw teamsError ?? scoresError
    const scoreMap = new Map((scores ?? []).map((score) => [score.team_id, score.score])); const result = (teams ?? []).map((team) => ({ id: team.id, code: team.team_code, name: team.name, score: scoreMap.get(team.id) ?? null }))
    return new Response(JSON.stringify({ eventName: event.name, eventStatus: event.status, teams: result, completedCount: result.filter((team) => team.score !== null).length, submittedAt: judge.submitted_at }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '读取失败。' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
