import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, Cloud, LockKeyhole, ShieldCheck } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { eventConfig } from '../../config/event'
import { claimAnonymousJudge, clearBoundIdentity, demoCodes, getEventState, getMyScorecard, isDemoMode, saveMyScore, subscribeToScoringUpdates, type Scorecard } from '../../data/scoringRepository'

type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'locked'
const scorePattern = /^\d{1,2}(\.\d)?$/
const partialScorePattern = /^\d{0,2}(\.\d?)?$/
const formatScore = (value: number | string) => Number(value).toFixed(1)

function IdentityGate({ onClaim }: { onClaim: () => Promise<void> }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setBusy(true); try { await claimAnonymousJudge(code); await onClaim() } catch (cause) { setError(cause instanceof Error ? cause.message : '验证失败，请稍后重试。') } finally { setBusy(false) } }
  return <div className="identity-page page-container"><div className="identity-card"><div className="identity-emblem"><ShieldCheck size={25} /></div><div className="eyebrow">匿名评委评分</div><h1>进入评分系统</h1><p className="identity-event">{eventConfig.name}</p><form onSubmit={submit}><label htmlFor="recovery-code">请输入您的匿名评分码</label><input id="recovery-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="例如 K7M4-82QX" autoComplete="off" autoCapitalize="characters" /><button className="primary-button" disabled={busy || code.trim().length < 4}>{busy ? '验证中…' : '进入评分系统'}</button>{error && <div className="form-error"><CircleAlert size={15} />{error}</div>}</form><div className="identity-note">匿名评分码仅用于恢复您的评分记录，<br />系统不会采集姓名、手机号等个人身份信息。</div></div>{isDemoMode && <div className="demo-banner"><Cloud size={15} /><span><strong>开发演示模式</strong> 可用测试码：{demoCodes.join(' · ')}</span></div>}</div>
}

function ScoreStatus({ state }: { state: SaveState }) { if (state === 'saving') return <div className="saving">正在保存…</div>; if (state === 'error') return <div className="save-error"><CircleAlert size={14} />保存失败，请重试</div>; if (state === 'saved') return <div className="saved"><Check size={14} />已保存</div>; if (state === 'locked') return <div className="locked-status"><LockKeyhole size={14} />已锁定</div>; return <div className="pending">待评分</div> }

export function ScorePage() {
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [showRecovery, setShowRecovery] = useState(false)
  const [loading, setLoading] = useState(true)
  const [identityError, setIdentityError] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [states, setStates] = useState<Record<string, SaveState>>({})
  const timers = useRef<Record<string, number>>({})
  const autoClaimCode = useRef(new URLSearchParams(window.location.search).get('code'))

  const loadScorecard = useCallback(async () => { setLoading(true); try { const event = await getEventState(); const next = event.status === 'prepare' ? { eventName: event.name, eventStatus: event.status, teams: event.teams.map((team) => ({ ...team, score: null })), completedCount: 0 } : await getMyScorecard(); setScorecard(next); setValues(Object.fromEntries(next.teams.map((team) => [team.id, team.score === null ? '' : formatScore(team.score)]))); setIdentityError(false) } catch { setIdentityError(true) } finally { setLoading(false) } }, [])
  useEffect(() => { const bootstrap = async () => { if (autoClaimCode.current) { try { await claimAnonymousJudge(autoClaimCode.current); autoClaimCode.current = null; window.history.replaceState({}, '', window.location.pathname) } catch { /* fall through to the manual-code screen */ } } await loadScorecard() }; void bootstrap(); const activeTimers = timers.current; const unsubscribe = subscribeToScoringUpdates(() => void loadScorecard()); return () => { Object.values(activeTimers).forEach(window.clearTimeout); unsubscribe() } }, [loadScorecard])

  const scheduleSave = (teamId: string, raw: string) => {
    if (scorecard?.eventStatus !== 'scoring') return
    window.clearTimeout(timers.current[teamId]);
    if (raw === '') { setStates((current) => ({ ...current, [teamId]: 'idle' })); return }
    const score = Number(raw)
    if (!partialScorePattern.test(raw)) { setStates((current) => ({ ...current, [teamId]: 'error' })); return }
    if (!scorePattern.test(raw)) { setStates((current) => ({ ...current, [teamId]: 'idle' })); return }
    if (!Number.isFinite(score) || score < 0 || score > eventConfig.fullScore) { setStates((current) => ({ ...current, [teamId]: 'error' })); return }
    setStates((current) => ({ ...current, [teamId]: 'saving' }))
    timers.current[teamId] = window.setTimeout(async () => { try { await saveMyScore(teamId, score); setValues((current) => ({ ...current, [teamId]: formatScore(score) })); setStates((current) => ({ ...current, [teamId]: 'saved' })); setScorecard((current) => current && { ...current, teams: current.teams.map((team) => team.id === teamId ? { ...team, score } : team), completedCount: current.teams.filter((team) => team.id === teamId ? true : team.score !== null).length }) } catch { setStates((current) => ({ ...current, [teamId]: 'error' })) } }, 650)
  }

  const normalizeOnBlur = (teamId: string) => { const raw = values[teamId] ?? ''; if (scorePattern.test(raw) && Number(raw) >= 0 && Number(raw) <= eventConfig.fullScore) setValues((current) => ({ ...current, [teamId]: formatScore(raw) })); else if (raw !== '') setStates((current) => ({ ...current, [teamId]: 'error' })) }

  if (loading) return <AppShell pageLabel="匿名评委评分" showNavigation={false}><div className="page-container loading-state">正在恢复匿名评分身份…</div></AppShell>
  if (identityError || showRecovery || !scorecard) return <><AppShell pageLabel="匿名评委评分" showNavigation={false}><IdentityGate onClaim={async () => { setShowRecovery(false); await loadScorecard() }} /></AppShell>{scorecard && <button className="recovery-dismiss" onClick={() => setShowRecovery(false)}>返回当前评分</button>}</>

  if (scorecard.eventStatus === 'prepare') return <AppShell pageLabel="匿名评委评分" showNavigation={false}><div className="score-page page-container"><div className="score-intro"><div className="eyebrow"><ShieldCheck size={15} />匿名评委评分</div><h1>评分尚未开始</h1><div className="status-message"><LockKeyhole size={17} /><span>评分尚未开始，请等待工作人员开启评分。</span></div></div></div></AppShell>

  const completed = scorecard.completedCount
  const isLocked = scorecard.eventStatus === 'locked' || scorecard.eventStatus === 'published'
  return <AppShell pageLabel="匿名评委评分" showNavigation={false}><div className="score-page page-container"><div className="score-intro"><div className="eyebrow"><ShieldCheck size={15} />匿名评委评分 {isDemoMode && <span className="mode-chip">DEMO</span>}</div><h1>{isLocked ? '评分已结束' : '请为参赛队伍评分'}</h1>{isLocked ? <div className="locked-note"><LockKeyhole size={16} /><div><strong>评分已结束，您的最终评分已锁定。</strong><span>当前页面仅供查看。</span></div></div> : <div className="score-guidance"><p>请确认参赛队伍名称后再填写评分。</p><p>评分范围为0.0—10.0分，请保留1位小数填写（如9.0、9.5）。</p></div>}<div className="progress-line"><span>已完成 <strong>{completed}</strong> / {eventConfig.teams.length}</span><div className="progress-track"><i style={{ width: `${completed / eventConfig.teams.length * 100}%` }} /></div></div></div><div className="score-list">{scorecard.teams.map((team, index) => <article className={`score-card ${team.score !== null ? 'is-complete' : ''}`} key={team.id}><div className="team-index">{String(index + 1).padStart(2, '0')}</div><div className="team-name">{team.name}</div><div className="score-input-wrap"><input aria-label={`${team.name}评分`} placeholder="—" value={values[team.id] ?? ''} readOnly={isLocked} onChange={(event) => { const next = event.target.value; setValues((current) => ({ ...current, [team.id]: next })); scheduleSave(team.id, next) }} onBlur={() => normalizeOnBlur(team.id)} inputMode="decimal" type="text" maxLength={4} /><span>/ {eventConfig.fullScore}</span></div><ScoreStatus state={isLocked ? 'locked' : states[team.id] || (team.score !== null ? 'saved' : 'idle')} /></article>)}</div>{!isLocked && completed === eventConfig.teams.length && <div className="complete-note"><Check size={16} /><div><strong>您已完成全部参赛队伍评分</strong><span>比赛评分锁定前，仍可修改已填写分数。</span></div></div>}<div className="score-actions"><div className="score-note"><LockKeyhole size={15} />{isLocked ? '评分已锁定，当前页面仅供查看。' : '评分仅与当前匿名身份关联，不显示其他评委数据。'}</div>{!isLocked && <button className="recovery-link" onClick={async () => { await clearBoundIdentity(); setScorecard(null); setShowRecovery(true); }}>恢复我的评分</button>}</div>{isDemoMode && <div className="demo-inline">开发演示模式 · 数据仅保存在当前浏览器</div>}</div></AppShell>
}
