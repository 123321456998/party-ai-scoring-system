import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Cloud, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { eventConfig } from '../../config/event'
import { claimAnonymousJudge, clearBoundIdentity, demoCodes, getEventState, getMyScorecard, isDemoMode, saveMyScore, submitMyScorecard, subscribeToScoringUpdates, type Scorecard } from '../../data/scoringRepository'

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'locked'
const scorePattern = /^(?:\d|[1-9]\d|100)$/
const partialScorePattern = /^\d{0,3}$/
const formatScore = (value: number | string) => String(Number(value))

function IdentityGate({ onClaim }: { onClaim: () => Promise<void> }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); const normalizedCode = code.trim(); if (!/^\d{4}$/.test(normalizedCode)) { setError('评分码无效，请核对后重新输入'); return } setBusy(true); try { await claimAnonymousJudge(normalizedCode); await onClaim() } catch { setError('评分码无效，请核对后重新输入') } finally { setBusy(false) } }
  return <div className="identity-page page-container"><div className="identity-card"><div className="identity-emblem"><ShieldCheck size={25} /></div><div className="eyebrow">匿名评委评分</div><h1>进入评分系统</h1><p className="identity-event">{eventConfig.name}</p><p className="identity-prompt">请输入工作人员提供的评分码</p><form onSubmit={submit}><label htmlFor="recovery-code">评分码</label><input id="recovery-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="例如 4827" autoComplete="off" autoCapitalize="off" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" /><button className="primary-button" disabled={busy || code.length !== 4}>{busy ? '验证中…' : '验证评分码并进入评分'}</button>{error && <div className="form-error"><CircleAlert size={15} />{error}</div>}</form><div className="identity-note">评分码仅用于恢复您的评分记录，<br />系统不会采集姓名、手机号等个人身份信息。</div></div>{isDemoMode && <div className="demo-banner"><Cloud size={15} /><span><strong>开发演示模式</strong> 可用测试码：{demoCodes.join(' · ')}</span></div>}</div>
}

function ScoreStatus({ state, submitted }: { state: SaveState; submitted?: boolean }) { if (submitted) return <div className="score-status saved"><Check size={14} /><span>已提交</span></div>; if (state === 'saving') return <div className="score-status saving"><span>正在保存…</span></div>; if (state === 'error') return <div className="score-status save-error"><CircleAlert size={14} /><span>保存失败，请重试</span></div>; if (state === 'saved') return <div className="score-status saved"><Check size={14} /><span>已保存</span></div>; if (state === 'locked') return <div className="score-status locked-status"><LockKeyhole size={14} /><span>已锁定</span></div>; return <div className="score-status pending"><span>待评分</span></div> }

export function ScorePage() {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [loading, setLoading] = useState(true)
  const [identityError, setIdentityError] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [states, setStates] = useState<Record<string, SaveState>>({})
  const [submissionNotice, setSubmissionNotice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const timers = useRef<Record<string, number>>({})

  const loadScorecard = useCallback(async () => { setLoading(true); try { const event = await getEventState(); const next = event.status === 'prepare' ? { eventName: event.name, eventStatus: event.status, teams: event.teams.map((team) => ({ ...team, score: null })), completedCount: 0 } : await getMyScorecard(); setScorecard(next); setValues(Object.fromEntries(next.teams.map((team) => [team.id, team.score === null ? '' : formatScore(team.score)]))); setIdentityError(false) } catch { setIdentityError(true) } finally { setLoading(false) } }, [])
  useEffect(() => { void loadScorecard(); const activeTimers = timers.current; const unsubscribe = subscribeToScoringUpdates(() => void loadScorecard()); return () => { Object.values(activeTimers).forEach(window.clearTimeout); unsubscribe() } }, [loadScorecard])

  const scheduleSave = (teamId: string, raw: string) => {
    if (scorecard?.eventStatus !== 'scoring') return
    window.clearTimeout(timers.current[teamId]);
    if (raw === '') { setStates((current) => ({ ...current, [teamId]: 'idle' })); return }
    const score = Number(raw)
    if (!partialScorePattern.test(raw)) { setStates((current) => ({ ...current, [teamId]: 'error' })); return }
    if (!scorePattern.test(raw)) { setStates((current) => ({ ...current, [teamId]: 'idle' })); return }
    if (!Number.isInteger(score) || score < 0 || score > eventConfig.fullScore) { setStates((current) => ({ ...current, [teamId]: 'error' })); return }
    setStates((current) => ({ ...current, [teamId]: 'saving' }))
    timers.current[teamId] = window.setTimeout(async () => { try { await saveMyScore(teamId, score); setValues((current) => ({ ...current, [teamId]: formatScore(score) })); setStates((current) => ({ ...current, [teamId]: 'saved' })); setSubmissionNotice(true); setScorecard((current) => current && { ...current, teams: current.teams.map((team) => team.id === teamId ? { ...team, score } : team), completedCount: current.teams.filter((team) => team.id === teamId ? true : team.score !== null).length }) } catch { setStates((current) => ({ ...current, [teamId]: 'error' })) } }, 650)
  }

  const normalizeOnBlur = (teamId: string) => { const raw = values[teamId] ?? ''; if (scorePattern.test(raw) && Number.isInteger(Number(raw)) && Number(raw) >= 0 && Number(raw) <= eventConfig.fullScore) setValues((current) => ({ ...current, [teamId]: formatScore(raw) })); else if (raw !== '') setStates((current) => ({ ...current, [teamId]: 'error' })) }
  const exitJudgeIdentity = async () => { await clearBoundIdentity(); setScorecard(null); setValues({}); setStates({}); setSubmissionNotice(false); setShowRecovery(true) }
  const confirmSubmit = async () => { if (!scorecard || completed !== eventConfig.teams.length || scorecard.submittedAt || submitting) return; if (!window.confirm('确认提交后，本轮评分将作为正式评分提交，是否确认？')) return; setSubmitError(''); setSubmitting(true); try { const result = await submitMyScorecard(); setScorecard((current) => current && { ...current, submittedAt: result.submittedAt }); setSubmissionNotice(true) } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : '提交失败，请重试。') } finally { setSubmitting(false) } }

  if (loading) return <AppShell pageLabel="匿名评委评分" showNavigation={false}><div className="page-container loading-state">正在恢复匿名评分身份…</div></AppShell>
  if (identityError || showRecovery || !scorecard) return <><AppShell pageLabel="匿名评委评分" showNavigation={false}><IdentityGate onClaim={async () => { setShowRecovery(false); await loadScorecard() }} /></AppShell>{scorecard && <button className="recovery-dismiss" onClick={() => setShowRecovery(false)}>返回当前评分</button>}</>

  if (scorecard.eventStatus === 'prepare') return <AppShell pageLabel="匿名评委评分" showNavigation={false}><div className="score-page page-container"><div className="score-intro"><div className="eyebrow"><ShieldCheck size={15} />匿名评委评分</div><h1>评分尚未开始</h1><div className="status-message"><LockKeyhole size={17} /><span>评分尚未开始，请等待工作人员开启评分。</span></div></div></div></AppShell>

  const completed = scorecard.completedCount
  const isLocked = scorecard.eventStatus === 'locked' || scorecard.eventStatus === 'published'
  return <AppShell pageLabel="匿名评委评分" showNavigation={false}><div className="score-page page-container"><div className="score-intro"><div className="eyebrow"><ShieldCheck size={15} />匿名评委评分 {isDemoMode && <span className="mode-chip">DEMO</span>}</div><h1>{isLocked ? '评分已结束' : '请为参赛队伍评分'}</h1>{isLocked ? <div className="locked-note"><LockKeyhole size={16} /><div><strong>评分已结束，您的最终评分已锁定。</strong><span>当前页面仅供查看。</span></div></div> : <div className="score-guidance"><p>请确认参赛队伍名称后再填写评分。</p><p>评分范围为0—100分，请填写整数（如95、100）。</p></div>}<div className="progress-line"><span>已完成 <strong>{completed}</strong> / {eventConfig.teams.length}</span><div className="progress-track"><i style={{ width: `${completed / eventConfig.teams.length * 100}%` }} /></div></div></div><div className="score-list">{scorecard.teams.map((team, index) => <article className={`score-card ${team.score !== null ? 'is-complete' : ''}`} key={team.id}><div className="team-info"><div className="team-heading"><div className="team-index">{String(index + 1).padStart(2, '0')}</div><div className="team-name">{team.name}</div></div><ScoreStatus submitted={Boolean(scorecard.submittedAt)} state={isLocked ? 'locked' : states[team.id] || (team.score !== null ? 'saved' : 'idle')} /></div><div className="score-input-wrap"><input aria-label={`${team.name}评分`} placeholder="—" value={values[team.id] ?? ''} readOnly={isLocked || Boolean(scorecard.submittedAt)} onChange={(event) => { const next = event.target.value; setValues((current) => ({ ...current, [team.id]: next })); scheduleSave(team.id, next) }} onBlur={() => normalizeOnBlur(team.id)} inputMode="numeric" type="text" maxLength={3} /><span>分 / {eventConfig.fullScore}</span></div></article>)}</div>{submissionNotice && !isLocked && <div className="submission-notice"><Check size={17} /><strong>评分已提交，请等待工作人员通知</strong></div>}{!isLocked && !scorecard.submittedAt && <div className="score-submit-block"><button className="primary-button score-submit-button" disabled={completed !== eventConfig.teams.length || submitting} onClick={() => void confirmSubmit()}>{submitting ? '提交中…' : '确认提交评分'}</button>{completed !== eventConfig.teams.length && <p>请完成全部队伍评分后提交</p>}{submitError && <div className="save-error"><CircleAlert size={14} />{submitError}</div>}</div>}{!isLocked && completed === eventConfig.teams.length && !scorecard.submittedAt && <div className="complete-note"><Check size={16} /><div><strong>您已完成全部参赛队伍评分</strong><span>提交后将不能继续修改评分。</span></div></div>}<div className="score-actions"><div className="score-note"><LockKeyhole size={15} />{isLocked ? '评分已锁定，当前页面仅供查看。' : scorecard.submittedAt ? '评分已确认提交，当前页面仅供查看。' : '评分仅与当前匿名身份关联，不显示其他评委数据。'}</div><button className="recovery-link" onClick={() => void exitJudgeIdentity()}><LogOut size={14} />退出评委身份</button></div>{isDemoMode && <div className="demo-inline">开发演示模式 · 数据仅保存在当前浏览器</div>}</div></AppShell>
}
