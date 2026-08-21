import { Link } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'
import { eventConfig } from '../../config/event'

export function HomePage() {
  return <AppShell pageLabel="评分系统入口" showNavigation={false}><div className="landing-page page-container"><div className="landing-card"><div className="eyebrow">现场评分系统</div><h1>{eventConfig.name}</h1><p>评分系统入口</p><div className="landing-actions"><Link className="primary-button" to="/score">评委评分</Link><Link className="secondary-button" to="/admin">工作人员后台</Link><Link className="secondary-button" to="/results">成绩展示</Link></div></div></div></AppShell>
}
