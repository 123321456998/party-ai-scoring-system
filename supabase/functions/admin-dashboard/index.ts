import { requireAdmin } from '../_shared/admin.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { event_key } = await req.json()
    const db = await requireAdmin(req)
    const { data: event } = await db.from('events').select('id,event_key,name,status,expected_judges,score_min,score_max').eq('event_key', event_key).single()
    if (!event) throw new Error('赛事不存在。')
    const [{ data: teams }, { data: judges }, { data: scores }, { data: finalResults }] = await Promise.all([
      db.from('teams').select('id,team_code,name').eq('event_id', event.id).order('team_code'),
      db.from('anonymous_judges').select('id').eq('event_id', event.id).eq('active', true),
      db.from('scores').select('anonymous_judge_id,team_id').eq('event_id', event.id),
      db.from('final_results').select('team_id,average_score,score_count,rank_position,award,tie').eq('event_id', event.id).order('rank_position'),
    ])
    const teamRows = teams ?? []
    const scoreRows = scores ?? []
    const judgeRows = judges ?? []
    const finalRows = finalResults ?? []
    const judgeProgress = judgeRows.map((judge, index) => { const count = scoreRows.filter((score) => score.anonymous_judge_id === judge.id).length; return { label: `匿名${String(index + 1).padStart(2, '0')}`, progress: count, completed: count === teamRows.length } })
    const teamProgress = teamRows.map((team) => ({ teamId: team.id, teamName: team.name, count: scoreRows.filter((score) => score.team_id === team.id).length, expected: event.expected_judges }))
    const expectedScores = event.expected_judges * teamRows.length
    const lockReasons = [...judgeProgress.filter((judge) => !judge.completed).map((judge) => `${judge.label}尚缺${teamRows.length - judge.progress}项评分。`), ...teamProgress.filter((team) => team.count < team.expected).map((team) => `${team.teamName}尚缺${team.expected - team.count}份评分。`)]
    const result = { name: event.name, subtitle: '党建引领 · 数智赋能', status: event.status, expectedJudges: event.expected_judges, teams: teamRows.map((team) => ({ id: team.id, code: team.team_code, name: team.name })), codes: [], judgeProgress, teamProgress, totalScores: scoreRows.length, expectedScores, completedJudges: judgeProgress.filter((judge) => judge.completed).length, canLock: event.status === 'scoring' && scoreRows.length === expectedScores && lockReasons.length === 0, canPublish: event.status === 'locked' && finalRows.length === teamRows.length, lockReasons, finalResults: finalRows.map((row) => ({ teamId: row.team_id, teamName: teamRows.find((team) => team.id === row.team_id)?.name ?? '', averageScore: Number(row.average_score), scoreCount: row.score_count, rankPosition: row.rank_position, award: row.award, tie: row.tie })), hasTies: finalRows.some((row) => row.tie) }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '读取失败。' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
