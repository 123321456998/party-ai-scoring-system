import { adminClient, currentAuthUid } from '../_shared/auth.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { event_key } = await req.json()
    const db = adminClient()
    const authUid = await currentAuthUid(req)
    const { data: event } = await db.from('events').select('id,status').eq('event_key', event_key).maybeSingle()
    if (!event || event.status !== 'scoring') throw new Error('当前赛事不在评分阶段。')

    const { data: session } = await db.from('judge_sessions').select('anonymous_judge_id').eq('event_id', event.id).eq('auth_uid', authUid).maybeSingle()
    if (!session) throw new Error('匿名身份尚未验证。')
    const { data: judge } = await db.from('anonymous_judges').select('id,submitted_at,active').eq('id', session.anonymous_judge_id).eq('event_id', event.id).maybeSingle()
    if (!judge || !judge.active) throw new Error('匿名评分身份已失效。')
    if (judge.submitted_at) return new Response(JSON.stringify({ ok: true, submittedAt: judge.submitted_at }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const [{ data: teams }, { data: scores }] = await Promise.all([
      db.from('teams').select('id').eq('event_id', event.id).eq('active', true),
      db.from('scores').select('team_id,score').eq('event_id', event.id).eq('anonymous_judge_id', judge.id),
    ])
    const teamRows = teams ?? []
    const scoreRows = scores ?? []
    if (teamRows.length === 0 || scoreRows.length !== teamRows.length || scoreRows.some((score) => !teamRows.some((team) => team.id === score.team_id) || typeof score.score !== 'number' || !Number.isInteger(score.score) || score.score < 0 || score.score > 10)) throw new Error('请完成全部队伍评分后提交。')

    const submittedAt = new Date().toISOString()
    const { data: updated, error } = await db.from('anonymous_judges').update({ submitted_at: submittedAt }).eq('id', judge.id).is('submitted_at', null).select('submitted_at').maybeSingle()
    if (error) throw error
    if (updated?.submitted_at) return new Response(JSON.stringify({ ok: true, submittedAt: updated.submitted_at }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    const { data: currentJudge } = await db.from('anonymous_judges').select('submitted_at').eq('id', judge.id).maybeSingle()
    return new Response(JSON.stringify({ ok: true, submittedAt: currentJudge?.submitted_at ?? submittedAt }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '提交失败。' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
