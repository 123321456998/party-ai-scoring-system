import { Link } from 'react-router-dom'
import { AppShell } from '../../components/layout/AppShell'

export function NotFoundPage() {
  return <AppShell pageLabel="页面不存在" showNavigation={false}><div className="not-found-page page-container"><div className="identity-card"><div className="eyebrow">404</div><h1>页面不存在</h1><Link className="primary-button" to="/">返回首页</Link></div></div></AppShell>
}
