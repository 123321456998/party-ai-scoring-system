import { adminClient, currentAuthUid, sha256 } from '../_shared/auth.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { event_key, anonymous_recovery_code } = await req.json()
    if (typeof event_key !== 'string' || typeof anonymous_recovery_code !== 'string') throw new Error('请求参数无效。')
    const db = adminClient(); const authUid = await currentAuthUid(req); const hash = await sha256(anonymous_recovery_code.trim().toUpperCase())
    const { data: event } = await db.from('events').select('id,status').eq('event_key', event_key).maybeSingle()
    if (!event || event.status !== 'scoring') throw new Error('当前赛事不在评分阶段。')
    const { data: judge } = await db.from('anonymous_judges').select('id').eq('event_id', event.id).eq('recovery_code_hash', hash).eq('active', true).maybeSingle()
    if (!judge) throw new Error('匿名评分码无效。')
    const { error } = await db.from('judge_sessions').upsert({ event_id: event.id, anonymous_judge_id: judge.id, auth_uid: authUid }, { onConflict: 'event_id,auth_uid' })
    if (error) throw error
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '验证失败。' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
