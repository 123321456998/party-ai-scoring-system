import { requireAdmin } from '../_shared/admin.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try {
    const { event_key } = await req.json()
    const db = await requireAdmin(req)
    const { data: event } = await db.from('events').select('id,event_key,name,status,expected_judges,score_min,score_max').eq('event_key', event_key).single()
    if (!event) throw new Error('赛事不存在。')
    const [{ data: teams }, { data: judges }, { data: sessions }, { data: scores }, { data: finalResults }] = await Promise.all([
      db.from('teams').select('id,team_code,name').eq('event_id', event.id).order('team_code'),
      db.from('anonymous_judges').select('id,submitted_at').eq('event_id', event.id).eq('active', true),
      db.from('judge_sessions').select('anonymous_judge_id').eq('event_id', event.id),
      db.from('scores').select('anonymous_judge_id,team_id').eq('event_id', event.id),
      db.from('final_results').select('team_id,average_score,score_count,rank_position,award,tie').eq('event_id', event.id).order('rank_position'),
    ])
    const judgeRows = judges ?? []
    const participantIds = new Set((sessions ?? []).map((session) => session.anonymous_judge_id))
    const scoreRows = scores ?? []
    const finalRows = finalResults ?? []
    const teamRows = teams ?? []
    const judgeProgress = judgeRows.map((judge, index) => { const count = scoreRows.filter((score) => score.anonymous_judge_id === judge.id).length; const status = !participantIds.has(judge.id) ? 'unused' as const : judge.submitted_at ? 'submitted' as const : 'scoring' as const; return { label: `匿名${String(index + 1).padStart(2, '0')}`, progress: count, completed: count === teamRows.length, status } })
    const actualParticipantIds = new Set([...participantIds].filter((id) => judgeRows.some((judge) => judge.id === id)))
    const actualParticipants = actualParticipantIds.size
    const submittedJudges = judgeRows.filter((judge) => participantIds.has(judge.id) && Boolean(judge.submitted_at)).length
    const inProgressJudges = actualParticipants - submittedJudges
    const unusedJudges = Math.max(0, judgeRows.length - actualParticipants)
    const teamProgress = teamRows.map((team) => ({ teamId: team.id, teamName: team.name, count: scoreRows.filter((score) => actualParticipantIds.has(score.anonymous_judge_id) && score.team_id === team.id).length, expected: actualParticipants }))
    const expectedScores = actualParticipants * teamRows.length
    const lockReasons = actualParticipants === 0 ? ['暂无实际参与评委。'] : judgeProgress.filter((judge) => judge.status === 'scoring' || (judge.status === 'submitted' && !judge.completed)).map((judge) => judge.status === 'submitted' ? `${judge.label}的评分尚未完整。` : `${judge.label}尚未确认提交。`)
    const result = { name: event.name, subtitle: '党建引领 · 数智赋能', status: event.status, expectedJudges: event.expected_judges, teams: teamRows.map((team) => ({ id: team.id, code: team.team_code, name: team.name })), codes: [], preGeneratedCodes: judgeRows.length, actualParticipants, submittedJudges, inProgressJudges, unusedJudges, judgeProgress, teamProgress, totalScores: scoreRows.length, expectedScores, completedJudges: submittedJudges, canLock: event.status === 'scoring' && actualParticipants > 0 && submittedJudges === actualParticipants && lockReasons.length === 0, canPublish: event.status === 'locked' && finalRows.length === teamRows.length, lockReasons, finalResults: finalRows.map((row) => ({ teamId: row.team_id, teamName: teamRows.find((team) => team.id === row.team_id)?.name ?? '', averageScore: Number(row.average_score), scoreCount: row.score_count, rankPosition: row.rank_position, award: row.award, tie: row.tie })), hasTies: finalRows.some((row) => row.tie) }
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '读取失败。' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
