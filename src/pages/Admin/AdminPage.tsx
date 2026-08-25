import { useCallback, useEffect, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { CheckCircle2, Clipboard, CircleAlert, KeyRound, Lock, Play, RefreshCw, Save, ShieldCheck, Users } from 'lucide-react'
import { AppShell } from '../../components/layout/AppShell'
import { SectionHeading } from '../../components/common/SectionHeading'
import { adminLogin, demoAdminPin, generateAnonymousCodes, getAdminDashboard, isDemoMode, lockAndFinalize, publishResults, resetDemoCompetition, resetEvent, saveEventConfig, startScoring, subscribeToScoringUpdates, type AdminDashboard } from '../../data/scoringRepository'

function AdminLogin({ onLogin }: { onLogin: () => Promise<void> }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setError(''); try { await adminLogin(pin); await onLogin() } catch (cause) { setError(cause instanceof Error ? cause.message : '验证失败。') } }
  return <div className="admin-login page-container"><div className="identity-card"><div className="identity-emblem"><KeyRound size={23} /></div><div className="eyebrow">工作人员入口</div><h1>进入现场控制台</h1><p className="identity-event">请使用管理员口令继续</p><form onSubmit={submit}><label htmlFor="admin-pin">管理员口令</label><input id="admin-pin" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="请输入口令" type="password" inputMode="numeric" /><button className="primary-button" disabled={pin.length < 4}>进入控制台</button>{error && <div className="form-error"><CircleAlert size={15} />{error}</div>}</form>{isDemoMode && <div className="demo-login-hint">DEMO 管理口令：<strong>{demoAdminPin}</strong></div>}</div></div>
}

const SCORING_ENTRY_URL = import.meta.env.VITE_SCORING_ENTRY_URL?.trim() || 'https://123321456998.github.io/party-ai-scoring-system/#/score'
const RESULTS_URL = `${import.meta.env.BASE_URL}#/results`

function QrCodeCard() {
  const download = () => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-qr-entry] canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = '统一评分入口二维码.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  return <div className="qr-card" data-qr-entry><QRCodeCanvas value={SCORING_ENTRY_URL} size={220} includeMargin /><strong>统一评分入口</strong><code>{SCORING_ENTRY_URL}</code><button className="text-button" onClick={download}>下载二维码</button></div>
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
  const copyGeneratedCodes = async () => { if (!dashboard?.codes.length) { setMessage('请先生成评分码。'); return } await navigator.clipboard?.writeText(dashboard.codes.join('\n')); setMessage('评分码已复制，请分别提供给评委。') }
  if (loading && !dashboard) return <AppShell pageLabel="现场评分控制台"><div className="page-container loading-state">正在加载控制台…</div></AppShell>
  if (loginError || !dashboard) return <AppShell pageLabel="现场评分控制台"><AdminLogin onLogin={load} /></AppShell>

  const isPrepare = dashboard.status === 'prepare'; const isScoring = dashboard.status === 'scoring'; const isLocked = dashboard.status === 'locked'; const isPublished = dashboard.status === 'published'
  const ask = (action: typeof confirmAction) => setConfirmAction(action)
  const confirmText = confirmAction === 'start' ? '开始评分后，评委即可使用二维码进入评分系统。' : confirmAction === 'lock' ? '锁定后所有评委将无法继续修改分数，系统将计算最终平均成绩并用于排名展示。' : confirmAction === 'publish' ? '公布后，最终成绩大屏将正式显示一等奖、二等奖和三等奖。' : '重置后将清空本轮全部评分和成绩，并使旧评分码失效。赛事设置和队伍名称将保留。'
  const confirm = async () => { const action = confirmAction === 'start' ? startScoring : confirmAction === 'lock' ? lockAndFinalize : confirmAction === 'publish' ? publishResults : isDemoMode ? resetDemoCompetition : resetEvent; const success = confirmAction === 'start' ? '评分已开始。' : confirmAction === 'lock' ? '评分已锁定，最终结果已生成。' : confirmAction === 'publish' ? '最终成绩已公布。' : '本轮比赛已重置，新的评分码已生成。'; setConfirmAction(null); await act(action, success) }

  return <AppShell pageLabel="现场评分控制台"><div className="admin-page page-container">
    <div className="admin-heading"><div className={`status-pill status-${dashboard.status}`}><span />{isPrepare ? '赛前准备' : isScoring ? '评分进行中' : isLocked ? '评分已锁定' : '最终成绩已公布'}</div></div>
    {message && <div className="admin-message"><CircleAlert size={15} />{message}</div>}
    <div className="stat-grid"><div className="stat-card"><Users /><span>预生成评分码</span><strong>{dashboard.preGeneratedCodes}</strong><small>最大/预备评委数量</small></div><div className="stat-card"><CheckCircle2 /><span>实际参与评分</span><strong>{dashboard.actualParticipants}</strong><small>评分中 {dashboard.inProgressJudges} · 未使用 {dashboard.unusedJudges}</small></div><div className="stat-card"><CheckCircle2 /><span>已确认提交</span><strong>{dashboard.submittedJudges} <em>/ {dashboard.actualParticipants}</em></strong><small>已提交评委数量</small></div><div className="stat-card accent"><Clipboard /><span>有效评分</span><strong>{dashboard.totalScores} <em>/ {dashboard.expectedScores || dashboard.actualParticipants * 6}</em></strong><small>当前有效评分总数</small></div></div>
    <div className="admin-grid admin-grid-top">
      <section className="panel"><SectionHeading eyebrow="EVENT SETUP" title="赛事设置" description={isPrepare ? 'prepare 状态下可以修改赛事基础信息' : '评分开始后赛事设置已锁定'} /><div className="settings-form"><label>赛事名称<input value={name} onChange={(event) => setName(event.target.value)} disabled={!isPrepare} /></label><label>匿名评委人数<input value={judges} onChange={(event) => setJudges(Number(event.target.value))} disabled={!isPrepare} type="number" min="1" max="99" /></label><div className="team-settings"><span>参赛队伍</span>{teams.map((team, index) => <label key={dashboard.teams[index].id}><b>{dashboard.teams[index].id}</b><input value={team} onChange={(event) => setTeams((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} disabled={!isPrepare} /></label>)}</div>{isPrepare && <button className="secondary-button" onClick={() => void act(() => saveEventConfig({ name, teams, expectedJudges: judges }), '赛事设置已保存。')}><Save size={16} />保存赛事设置</button>}</div></section>
      <section className="panel shared-access-panel"><SectionHeading eyebrow="SHARED ACCESS" title="统一评分入口二维码" description="所有评委扫码进入评分入口，再输入工作人员提供的评分码" /><div className="shared-access-content"><div className="qr-grid"><QrCodeCard /></div>{dashboard.codes.length > 0 && <div className="shared-code-list code-list" aria-label="已生成评分码">{dashboard.codes.map((code, index) => <div key={code}><span>评委 {String(index + 1).padStart(2, '0')}</span><code>{code}</code></div>)}</div>}<div className="shared-access-actions"><button className="secondary-button" onClick={() => window.print()}>打印二维码</button><div className="code-warning"><CircleAlert size={14} />扫码进入评分入口，请输入工作人员提供的评分码。</div><button className="secondary-button" onClick={() => void copyGeneratedCodes()} disabled={!dashboard.codes.length}><Clipboard size={16} />复制评分码</button>{isPrepare && dashboard.codes.length === 0 && <button className="secondary-button" onClick={() => void act(generateAnonymousCodes, '评分码已生成，请分别提供给评委。')}><RefreshCw size={16} />生成评分码</button>}</div></div></section>
    </div>
    <div className="admin-actions"><div className="action-copy">{isPrepare ? '完成赛事设置和评分码后即可开启评分。' : isScoring ? '所有评分完成后才能锁定并生成最终结果。' : isLocked ? '评分已锁定，最终成绩尚未公布。' : '最终成绩已公布，评委端只读。'}</div>{isPrepare && <button className="primary-button action-button" disabled={!dashboard.name || dashboard.codes.length !== dashboard.expectedJudges} onClick={() => ask('start')}><Play size={17} />开始评分</button>}{isScoring && <button className="primary-button action-button" disabled={!dashboard.canLock} onClick={() => ask('lock')}><Lock size={17} />锁定评分并生成结果</button>}{isLocked && <><span className="locked-action-label">评分已锁定</span><button className="primary-button action-button" disabled={!dashboard.canPublish} onClick={() => ask('publish')}>公布最终成绩</button></>}{isPublished && <a className="secondary-button open-results-button" href={RESULTS_URL}>打开成绩大屏</a>}</div>
    <section className="danger-zone"><div><div className="eyebrow">赛事管理 / 危险操作</div><p>重置本轮将清空评分和成绩，并使旧评分码失效；赛事设置和队伍名称会保留。</p></div><button className="danger-button" onClick={() => ask('reset')}>重置本轮比赛</button></section>
    {isScoring && !dashboard.canLock && <div className="lock-reasons"><CircleAlert size={15} /><div><strong>尚有评分未完成，暂不能生成最终结果。</strong>{dashboard.lockReasons.slice(0, 4).map((reason) => <span key={reason}>{reason}</span>)}</div></div>}
    <div className="admin-grid"><section className="panel"><SectionHeading eyebrow="SCORING STATUS" title="匿名评委完成情况" description="仅显示匿名序号与完成数量" /><div className="judge-list">{dashboard.judgeProgress.map((judge) => { const submitted = judge.status === 'submitted'; const unused = judge.status === 'unused'; return <div className="judge-row" key={judge.label}><span className="avatar">{judge.label.slice(-2, -1)}</span><strong>{judge.label}</strong><span className="judge-progress">{judge.progress} / 6</span><span className={submitted ? 'tag success' : unused ? 'tag' : 'tag warning'}>{submitted ? <CheckCircle2 size={14} /> : unused ? <Users size={14} /> : <CircleAlert size={14} />}{submitted ? '已提交' : unused ? '未使用' : '评分中'}</span></div> })}</div></section><section className="panel"><SectionHeading eyebrow="TEAM STATUS" title="队伍评分情况" description={isLocked || isPublished ? '评分已锁定，以下为最终汇总状态' : '评分阶段不显示平均分或排名'} /><div className="team-progress-list">{dashboard.teamProgress.map((team) => <div className="team-progress" key={team.teamId}><span>{team.teamName}</span><div className="mini-track"><i style={{ width: `${team.expected ? team.count / team.expected * 100 : 0}%` }} /></div><b>{team.count} / {team.expected}</b></div>)}</div></section></div>
    {(isLocked || isPublished) && dashboard.finalResults.length > 0 && <section className="panel final-summary"><SectionHeading eyebrow="FINAL SNAPSHOT" title="最终结果已生成" description={isPublished ? '最终成绩已公布' : '结果快照已生成，等待正式公布'} /><div className="final-result-list">{dashboard.finalResults.map((result) => <div key={result.teamId}><span>0{result.rankPosition}</span><strong>{result.teamName}</strong><b>{result.averageScore.toFixed(2)}</b><small>{result.award}{result.tie ? ' · 同分待确认' : ''}</small></div>)}</div></section>}
    {confirmAction && <div className="confirm-overlay"><div className="confirm-panel"><div className="eyebrow"><ShieldCheck size={15} />操作确认</div><h2>{confirmAction === 'start' ? '确认开始评分？' : confirmAction === 'lock' ? '确认锁定全部评分？' : confirmAction === 'publish' ? '确认公布最终成绩？' : '确认重置本轮比赛？'}</h2><p>{confirmText}</p>{confirmAction === 'lock' && <ul><li>所有评委将无法继续修改分数</li><li>系统将计算最终平均成绩</li><li>最终成绩将用于排名展示</li></ul>}<div className="confirm-actions"><button className="secondary-button" onClick={() => setConfirmAction(null)}>取消</button><button className="primary-button" onClick={() => void confirm()}>{confirmAction === 'start' ? '确认开始评分' : confirmAction === 'lock' ? '确认锁定并生成结果' : confirmAction === 'publish' ? '确认公布' : '确认重置本轮'}</button></div></div></div>}
  </div></AppShell>
}
