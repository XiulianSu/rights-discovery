import type { ReactNode } from 'react'
import { navigate, usePath, parsePath } from '../lib/router'
import { useApp } from '../lib/store'
import { Icon } from './ui'

const NAV = [
  { path: '/discover', label: '发现', icon: 'search' as const },
  { path: '/policies', label: '政策list', icon: 'book' as const },
  { path: '/actions', label: '行动', icon: 'list' as const },
  { path: '/docs', label: '资料', icon: 'user' as const },
]

export function Shell({ children }: { children: ReactNode }) {
  const full = usePath()
  const { path } = parsePath(full)
  const app = useApp()
  const onPolicyDetail = path.startsWith('/policy/')
  const showNav =
    !onPolicyDetail &&
    (app.askedOnce || path.startsWith('/policies')) &&
    ['/discover', '/actions', '/docs', '/policies'].some((p) => path.startsWith(p) || path.startsWith('/opportunity'))

  return (
    <div className="stage">
      <div className="device">
        <div className="notch" aria-hidden />
        <div className={`app ${showNav ? 'has-nav' : ''}`}>{children}</div>
        {showNav && (
          <nav className="tabbar">
            {NAV.map((item) => {
              const on =
                path === item.path ||
                (item.path === '/discover' && path.startsWith('/opportunity')) ||
                (item.path === '/policies' && path.startsWith('/policy/'))
              return (
                <button key={item.path} className={on ? 'on' : ''} onClick={() => navigate(item.path)} type="button">
                  <Icon name={item.icon} size={22} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}

export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="topbar">
      <button type="button" className="icon-btn" onClick={onBack ?? (() => history.back())} aria-label="返回">
        <Icon name="back" />
      </button>
      <h1>{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  )
}
