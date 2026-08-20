import { NavLink } from 'react-router-dom'
import { BarChart3, ClipboardPenLine, LayoutDashboard } from 'lucide-react'
import { eventConfig } from '../../config/event'

export function BrandMark() { return <div className="brand-mark"><span>党</span><span className="brand-mark-line" /></div> }

export function AppShell({ children, pageLabel, showNavigation = true, immersive = false }: { children: React.ReactNode; pageLabel?: string; showNavigation?: boolean; immersive?: boolean }) {
  return <div className={`app-shell ${immersive ? 'is-immersive' : ''}`}>{!immersive && <header className="topbar"><div className="brand"><BrandMark /><div><div className="brand-name">{eventConfig.name}</div><div className="brand-subtitle">{eventConfig.subtitle}</div></div></div>{showNavigation && <nav className="main-nav"><NavLink to="/score"><ClipboardPenLine size={16} />评分器</NavLink><NavLink to="/admin"><LayoutDashboard size={16} />控制后台</NavLink><NavLink to="/results"><BarChart3 size={16} />成绩大屏</NavLink></nav>}{pageLabel && <span className="topbar-label">{pageLabel}</span>}</header>}<main>{children}</main>{!immersive && <footer className="site-footer"><span>{eventConfig.subtitle}</span><span>现场评分系统 · 第二阶段核心能力演示</span></footer>}</div>
}
