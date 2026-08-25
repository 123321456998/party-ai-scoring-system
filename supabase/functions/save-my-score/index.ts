import { adminClient, currentAuthUid } from '../_shared/auth.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { team_id, score } = await req.json(); if (typeof team_id !== 'string' || typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 100) throw new Error('评分必须是 0 到 100 之间的整数。')
    const db = adminClient(); const authUid = await currentAuthUid(req); const { data: event } = await db.from('events').select('id').eq('event_key', 'party-ai-business-ai').eq('status', 'scoring').maybeSingle(); if (!event) throw new Error('赛事不可用。')
    const { data: session } = await db.from('judge_sessions').select('anonymous_judge_id').eq('event_id', event.id).eq('auth_uid', authUid).maybeSingle(); if (!session) throw new Error('匿名身份尚未验证。')
    const { data: judge } = await db.from('anonymous_judges').select('submitted_at,active').eq('id', session.anonymous_judge_id).eq('event_id', event.id).maybeSingle(); if (!judge || !judge.active) throw new Error('匿名评分身份已失效。'); if (judge.submitted_at) throw new Error('评分已确认提交，不能继续修改。')
    const { data: team } = await db.from('teams').select('id').eq('id', team_id).eq('event_id', event.id).eq('active', true).maybeSingle(); if (!team) throw new Error('队伍不属于当前赛事。')
    const { data, error } = await db.from('scores').upsert({ event_id: event.id, anonymous_judge_id: session.anonymous_judge_id, team_id: team.id, score, updated_at: new Date().toISOString() }, { onConflict: 'event_id,anonymous_judge_id,team_id' }).select('score,updated_at').single(); if (error) throw error
    return new Response(JSON.stringify({ score: data.score, updatedAt: data.updated_at }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '保存失败。' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
