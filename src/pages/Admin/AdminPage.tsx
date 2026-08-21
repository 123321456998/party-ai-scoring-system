import { useCallback, useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { CheckCircle2, Clipboard, CircleAlert, KeyRound, Lock, Play, RefreshCw, Save, ShieldCheck, Users } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { SectionHeading } from '../../components/common/SectionHeading'
import { adminLogin, demoAdminPin, generateAnonymousCodes, getAdminDashboard, isDemoMode, lockAndFinalize, publishResults, resetDemoCompetition, saveEventConfig, startScoring, subscribeToScoringUpdates, type AdminDashboard } from '../../data/scoringRepository'

function AdminLogin({ onLogin }: { onLogin: () => Promise<void> }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await adminLogin(pin); await onLogin() } catch (cause) { setError(cause instanceof Error ? cause.message : '验证失败。') } }
  return <div className="admin-login page-container"><div className="identity-card"><div className="identity-emblem"><KeyRound size={23} /></div><div className="eyebrow">工作人员入口</div><h1>进入现场控制台</h1><p className="identity-event">请使用管理员口令继续</p><form onSubmit={submit}><label htmlFor="admin-pin">管理员口令</label><input id="admin-pin" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="请输入口令" type="password" inputMode="numeric" /><button className="primary-button" disabled={pin.length < 4}>进入控制台</button>{error && <div className="form-error"><CircleAlert size={15} />{error}</div>}</form>{isDemoMode && <div className="demo-login-hint">DEMO 管理口令：<strong>{demoAdminPin}</strong></div>}</div></div>
}

const SCORING_ENTRY_URL = 'https://party-ai-scoring-system.vercel.app'

function QrCodeCard() {
  const download = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-qr-entry] canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = '统一评分入口二维码.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  return <div className="qr-card" data-qr-entry><QRCodeCanvas value={SCORING_ENTRY_URL} size={156} includeMargin /><strong>统一评分入口</strong><code>{SCORING_ENTRY_URL}</code><button className="text-button" onClick={download}>下载二维码</button></div>
}

export function AdminPage() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState(false)
  const [name, setName] = useState('')
  const [teams, setTeams] = useState<string[]>([])
  const [judges, setJudges] = useState(7)
  const [message, setMessage] = useState('')
  const [confirmAction, setConfirmAction] = useState<'start' | 'lock' | 'publish' | 'reset' | null>(null)

  const load = useCallback(async () => { setLoading(true); try { const next = await getAdminDashboard(); setDashboard(next); setName(next.name); setTeams(next.teams.map((team) => team.name)); setJudges(next.expectedJudges); setLoginError(false) } catch (cause) { window.alert(cause instanceof Error ? cause.message : '读取控制台失败。'); setLoginError(true) } finally { setLoading(false) } }, [])
  useEffect(() => { void load(); return subscribeToScoringUpdates(() => void load()) }, [load])
  const act = async (action: () => Promise<unknown>, success: string) => { try { await action(); setMessage(success); await load() } catch (cause) { setMessage(cause instanceof Error ? cause.message : '操作失败。') } }
  if (loading && !dashboard) return <AppShell pageLabel="现场评分控制台"><div className="page-container loading-state">正在加载控制台…</div></AppShell>
  if (loginError || !dashboard) return <AppShell pageLabel="现场评分控制台"><AdminLogin onLogin={load} /></AppShell>

  const isPrepare = dashboard.status === 'prepare'; const isScoring = dashboard.status === 'scoring'; const isLocked = dashboard.status === 'locked'; const isPublished = dashboard.status === 'published'
  const ask = (action: typeof confirmAction) => setConfirmAction(action)
  const confirmText = confirmAction === 'start' ? '开始评分后，评委即可使用二维码进入评分系统。' : confirmAction === 'lock' ? '锁定后所有评委将无法继续修改分数，系统将计算最终平均成绩并用于排名展示。' : confirmAction === 'publish' ? '公布后，最终成绩大屏将正式显示一等奖、二等奖和三等奖。' : '将清除全部 DEMO 匿名身份、评分和结果，是否继续？'
  const confirm = async () => { const action = confirmAction === 'start' ? startScoring : confirmAction === 'lock' ? lockAndFinalize : confirmAction === 'publish' ? publishResults : resetDemoCompetition; const success = confirmAction === 'start' ? '评分已开始。' : confirmAction === 'lock' ? '评分已锁定，最终结果已生成。' : confirmAction === 'publish' ? '最终成绩已公布。' : 'DEMO 比赛已重置。'; setConfirmAction(null); await act(action, success) }

  return <AppShell pageLabel="现场评分控制台"><div className="admin-page page-container">
    <div className="admin-heading"><div><div className="eyebrow">工作人员后台 {isDemoMode && <span className="mode-chip">DEMO</span>}</div><h1>现场评分控制台</h1><p>{dashboard.name} · {dashboard.subtitle}</p></div><div className={`status-pill status-${dashboard.status}`}><span />{isPrepare ? '赛前准备' : isScoring ? '评分进行中' : isLocked ? '评分已锁定' : '最终成绩已公布'}</div></div>
    {message && <div className="admin-message"><CircleAlert size={15} />{message}</div>}
    <div className="stat-grid"><div className="stat-card"><Users /><span>匿名评委</span><strong>{dashboard.expectedJudges}</strong><small>已设置评委人数</small></div><div className="stat-card"><CheckCircle2 /><span>全部完成</span><strong>{dashboard.completedJudges} <em>/ {dashboard.expectedJudges}</em></strong><small>已完成全部评分</small></div><div className="stat-card accent"><Clipboard /><span>有效评分</span><strong>{dashboard.totalScores} <em>/ {dashboard.expectedScores || dashboard.expectedJudges * 6}</em></strong><small>当前有效评分总数</small></div></div>
    <div className="admin-grid admin-grid-top">
      <section className="panel"><SectionHeading eyebrow="EVENT SETUP" title="赛事设置" description={isPrepare ? 'prepare 状态下可以修改赛事基础信息' : '评分开始后赛事设置已锁定'} /><div className="settings-form"><label>赛事名称<input value={name} onChange={(event) => setName(event.target.value)} disabled={!isPrepare} /></label><label>匿名评委人数<input value={judges} onChange={(event) => setJudges(Number(event.target.value))} disabled={!isPrepare} type="number" min="1" max="99" /></label><div className="team-settings"><span>参赛队伍</span>{teams.map((team, index) => <label key={dashboard.teams[index].id}><b>{dashboard.teams[index].id}</b><input value={team} onChange={(event) => setTeams((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} disabled={!isPrepare} /></label>)}</div>{isPrepare && <button className="secondary-button" onClick={() => void act(() => saveEventConfig({ name, teams, expectedJudges: judges }), '赛事设置已保存。')}><Save size={16} />保存赛事设置</button>}</div></section>
      <section className="panel"><SectionHeading eyebrow="SHARED ACCESS" title="统一评分入口二维码" description="所有评委扫码进入首页，再输入工作人员提供的评分码" /><div className="qr-grid"><QrCodeCard /></div><button className="secondary-button" onClick={() => window.print()}>打印二维码</button><div className="code-warning"><CircleAlert size={14} />二维码不绑定评委身份。请将评分码分别提供给评委，扫码后在首页输入评分码。</div><button className="secondary-button" onClick={() => void navigator.clipboard?.writeText(dashboard.codes.join('\n'))}><Clipboard size={16} />复制评分码</button>{isPrepare && dashboard.codes.length === 0 && <button className="secondary-button" onClick={() => void act(generateAnonymousCodes, '评分码已生成，请分别提供给评委。')}><RefreshCw size={16} />生成评分码</button>}</section>
    </div>
    <div className="admin-actions"><div className="action-copy">{isPrepare ? '完成赛事设置和评分码后即可开启评分。' : isScoring ? '所有评分完成后才能锁定并生成最终结果。' : isLocked ? '评分已锁定，最终成绩尚未公布。' : '最终成绩已公布，评委端只读。'}</div>{isPrepare && <button className="primary-button action-button" disabled={!dashboard.name || dashboard.codes.length !== dashboard.expectedJudges} onClick={() => ask('start')}><Play size={17} />开始评分</button>}{isScoring && <button className="primary-button action-button" disabled={!dashboard.canLock} onClick={() => ask('lock')}><Lock size={17} />锁定评分并生成结果</button>}{isLocked && <><span className="locked-action-label">评分已锁定</span><button className="primary-button action-button" disabled={!dashboard.canPublish} onClick={() => ask('publish')}>公布最终成绩</button></>}{isPublished && <a className="secondary-button open-results-button" href="/results">打开成绩大屏</a>}{isDemoMode && <button className="text-button" onClick={() => ask('reset')}>DEMO 重置比赛</button>}</div>
    {isScoring && !dashboard.canLock && <div className="lock-reasons"><CircleAlert size={15} /><div><strong>尚有评分未完成，暂不能生成最终结果。</strong>{dashboard.lockReasons.slice(0, 4).map((reason) => <span key={reason}>{reason}</span>)}</div></div>}
    <div className="admin-grid"><section className="panel"><SectionHeading eyebrow="SCORING STATUS" title="匿名评委完成情况" description="仅显示匿名序号与完成数量" /><div className="judge-list">{dashboard.judgeProgress.map((judge) => <div className="judge-row" key={judge.label}><span className="avatar">{judge.label.slice(-2, -1)}</span><strong>{judge.label}</strong><span className="judge-progress">{judge.progress} / 6</span><span className={judge.completed ? 'tag success' : 'tag warning'}>{judge.completed ? <CheckCircle2 size={14} /> : <CircleAlert size={14} />}{judge.completed ? '已完成' : '未完成'}</span></div>)}</div></section><section className="panel"><SectionHeading eyebrow="TEAM STATUS" title="队伍评分情况" description={isLocked || isPublished ? '评分已锁定，以下为最终汇总状态' : '评分阶段不显示平均分或排名'} /><div className="team-progress-list">{dashboard.teamProgress.map((team) => <div className="team-progress" key={team.teamId}><span>{team.teamName}</span><div className="mini-track"><i style={{ width: `${team.expected ? team.count / team.expected * 100 : 0}%` }} /></div><b>{team.count} / {team.expected}</b></div>)}</div></section></div>
    {(isLocked || isPublished) && dashboard.finalResults.length > 0 && <section className="panel final-summary"><SectionHeading eyebrow="FINAL SNAPSHOT" title="最终结果已生成" description={isPublished ? '最终成绩已公布' : '结果快照已生成，等待正式公布'} /><div className="final-result-list">{dashboard.finalResults.map((result) => <div key={result.teamId}><span>0{result.rankPosition}</span><strong>{result.teamName}</strong><b>{result.averageScore.toFixed(2)}</b><small>{result.award}{result.tie ? ' · 同分待确认' : ''}</small></div>)}</div></section>}
    {confirmAction && <div className="confirm-overlay"><div className="confirm-panel"><div className="eyebrow"><ShieldCheck size={15} />操作确认</div><h2>{confirmAction === 'start' ? '确认开始评分？' : confirmAction === 'lock' ? '确认锁定全部评分？' : confirmAction === 'publish' ? '确认公布最终成绩？' : '确认重置 DEMO 比赛？'}</h2><p>{confirmText}</p>{confirmAction === 'lock' && <ul><li>所有评委将无法继续修改分数</li><li>系统将计算最终平均成绩</li><li>最终成绩将用于排名展示</li></ul>}<div className="confirm-actions"><button className="secondary-button" onClick={() => setConfirmAction(null)}>取消</button><button className="primary-button" onClick={() => void confirm()}>{confirmAction === 'start' ? '确认开始评分' : confirmAction === 'lock' ? '确认锁定并生成结果' : confirmAction === 'publish' ? '确认公布' : '确认重置比赛'}</button></div></div></div>}
  </div></AppShell>
}
