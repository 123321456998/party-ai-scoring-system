import { requireAdmin } from '../_shared/admin.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

function randomCode() { const range = 9000; const limit = Math.floor(0x100000000 / range) * range; const bytes = new Uint32Array(1); do crypto.getRandomValues(bytes); while (bytes[0] >= limit); return String(1000 + bytes[0] % range) }
async function sha256(value: string) { const bytes = new TextEncoder().encode(value); const hash = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try { const { action, event_key, payload } = await req.json(); const db = await requireAdmin(req); const { data: event } = await db.from('events').select('*').eq('event_key', event_key).single(); if (!event) throw new Error('赛事不存在。');
    if (action === 'save-event-config') { if (event.status !== 'prepare') throw new Error('评分开始后不能修改赛事设置。'); await db.from('events').update({ name: payload.name, expected_judges: payload.expectedJudges, updated_at: new Date().toISOString() }).eq('id', event.id); for (const team of (payload.teams as { code: string; name: string }[])) { const { error } = await db.from('teams').update({ name: team.name }).eq('event_id', event.id).eq('team_code', team.code); if (error) throw error }; return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    if (action === 'generate-anonymous-codes') { if (event.status !== 'prepare') throw new Error('仅 prepare 状态可生成评分码。'); const { count } = await db.from('scores').select('id', { count: 'exact', head: true }).eq('event_id', event.id); if ((count ?? 0) > 0) throw new Error('已有评分，不能重新生成评分码。'); const codes = new Set<string>(); while (codes.size < event.expected_judges) codes.add(randomCode()); await db.from('anonymous_judges').delete().eq('event_id', event.id); const rows = []; for (const code of codes) rows.push({ event_id: event.id, recovery_code_hash: await sha256(code) }); const { error } = await db.from('anonymous_judges').insert(rows); if (error) throw error; return new Response(JSON.stringify({ ok: true, codes: [...codes] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    if (action === 'reset-event') { const codes = new Set<string>(); while (codes.size < event.expected_judges) codes.add(randomCode()); const eventFilter = { event_id: event.id }; const { error: scoreError } = await db.from('scores').delete().match(eventFilter); if (scoreError) throw scoreError; const { error: sessionError } = await db.from('judge_sessions').delete().match(eventFilter); if (sessionError) throw sessionError; const { error: resultError } = await db.from('final_results').delete().match(eventFilter); if (resultError) throw resultError; const { error: judgeError } = await db.from('anonymous_judges').delete().match(eventFilter); if (judgeError) throw judgeError; const rows = [...codes].map((code) => ({ event_id: event.id, recovery_code_hash: code })); for (const row of rows) row.recovery_code_hash = await sha256(row.recovery_code_hash); const { error: insertError } = await db.from('anonymous_judges').insert(rows); if (insertError) throw insertError; const { error: eventError } = await db.from('events').update({ status: 'prepare', updated_at: new Date().toISOString() }).eq('id', event.id); if (eventError) throw eventError; return new Response(JSON.stringify({ ok: true, codes: [...codes] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    if (action === 'start-scoring') { const { count } = await db.from('anonymous_judges').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('active', true); if (event.status !== 'prepare' || count !== event.expected_judges) throw new Error('赛事设置或匿名评分码未完成。'); await db.from('events').update({ status: 'scoring', updated_at: new Date().toISOString() }).eq('id', event.id); return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    if (action === 'lock-and-finalize') {
      if (event.status !== 'scoring') throw new Error('当前不在评分阶段。')
      const [{ data: teams }, { data: judges }, { data: scores }] = await Promise.all([
        db.from('teams').select('id,name').eq('event_id', event.id).eq('active', true),
        db.from('anonymous_judges').select('id,submitted_at').eq('event_id', event.id).eq('active', true),
        db.from('scores').select('anonymous_judge_id,team_id,score').eq('event_id', event.id),
      ])
      const teamRows = teams ?? []
      const judgeRows = judges ?? []
      const submitted = judgeRows.filter((judge) => Boolean(judge.submitted_at))
      if (submitted.length === 0) throw new Error('至少需要一位评委确认提交全部评分后才能锁定。')
      const scoreRows = scores ?? []
      for (const judge of submitted) {
        const judgeScores = scoreRows.filter((score) => score.anonymous_judge_id === judge.id)
        if (judgeScores.length !== teamRows.length || judgeScores.some((score) => !teamRows.some((team) => team.id === score.team_id) || typeof score.score !== 'number' || !Number.isInteger(score.score) || score.score < 0 || score.score > 10)) throw new Error('已提交评委的评分尚未完整。')
      }
      const submittedIds = new Set(submitted.map((judge) => judge.id))
      const results = teamRows.map((team) => { const values = scoreRows.filter((score) => submittedIds.has(score.anonymous_judge_id) && score.team_id === team.id).map((score) => Number(score.score)); if (values.length !== submitted.length) throw new Error('已提交评委的评分尚未完整。'); return { event_id: event.id, team_id: team.id, average_score: Number(((values.reduce((sum, value) => sum + value, 0) / values.length) * 10).toFixed(2)), score_count: values.length, rank_position: 0, award: '三等奖', tie: false } }).sort((a, b) => b.average_score - a.average_score)
      results.forEach((result, index, all) => { result.rank_position = index + 1; result.award = index === 0 ? '一等奖' : index < 3 ? '二等奖' : '三等奖'; result.tie = index > 0 && result.average_score === all[index - 1].average_score })
      const { error: deleteError } = await db.from('final_results').delete().eq('event_id', event.id); if (deleteError) throw deleteError
      const { error: insertError } = await db.from('final_results').insert(results); if (insertError) throw insertError
      const { error: eventError } = await db.from('events').update({ status: 'locked', updated_at: new Date().toISOString() }).eq('id', event.id); if (eventError) throw eventError
      return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (action === 'publish-results') { if (event.status !== 'locked') throw new Error('只有 locked 状态才能公布成绩。'); const { count } = await db.from('final_results').select('id', { count: 'exact', head: true }).eq('event_id', event.id); const { count: teamCount } = await db.from('teams').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('active', true); if ((count ?? 0) !== (teamCount ?? 0)) throw new Error('最终结果尚未完整生成。'); const { error } = await db.from('events').update({ status: 'published', updated_at: new Date().toISOString() }).eq('id', event.id); if (error) throw error; return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
    throw new Error('不支持的管理操作。')
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '操作失败。' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
