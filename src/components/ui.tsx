import type { ReactNode } from 'react'
import { STATUS_LABEL, type OppStatus } from '../lib/types'

export function Icon({
  name,
  size = 20,
}: {
  name:
    | 'back'
    | 'home'
    | 'search'
    | 'check'
    | 'list'
    | 'user'
    | 'alert'
    | 'link'
    | 'file'
    | 'coin'
    | 'house'
    | 'shield'
    | 'book'
    | 'close'
    | 'clock'
    | 'bell'
    | 'chevron'
  size?: number
}) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' as const }
  switch (name) {
    case 'back':
      return (
        <svg {...p}>
          <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'home':
      return (
        <svg {...p}>
          <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'search':
      return (
        <svg {...p}>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'check':
      return (
        <svg {...p}>
          <path d="M5 12.5 10 17l9-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'list':
      return (
        <svg {...p}>
          <path d="M8 7h12M8 12h12M8 17h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="4" cy="7" r="1.2" fill="currentColor" />
          <circle cx="4" cy="12" r="1.2" fill="currentColor" />
          <circle cx="4" cy="17" r="1.2" fill="currentColor" />
        </svg>
      )
    case 'user':
      return (
        <svg {...p}>
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 19.2c.8-3.2 3.3-5 7-5s6.2 1.8 7 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'alert':
      return (
        <svg {...p}>
          <path d="M12 8.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.4" r="1" fill="currentColor" />
          <path d="M12 4 3.6 19h16.8L12 4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      )
    case 'link':
      return (
        <svg {...p}>
          <path d="M10 14.5 8.8 15.7a3 3 0 0 1-4.2-4.2l3.3-3.3a3 3 0 0 1 4.2 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M14 9.5 15.2 8.3a3 3 0 0 1 4.2 4.2l-3.3 3.3a3 3 0 0 1-4.2 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'file':
      return (
        <svg {...p}>
          <path d="M7 4h7l5 5v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'coin':
      return (
        <svg {...p}>
          <ellipse cx="12" cy="8" rx="7" ry="3.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8v8c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'house':
      return (
        <svg {...p}>
          <path d="M4 11 12 4.5 20 11v8.5H4V11Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'book':
      return (
        <svg {...p}>
          <path d="M5 5.5h6.2A2.8 2.8 0 0 1 14 8.3V20c-1.7-1-3.4-1.4-5.4-1.4H5V5.5Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M19 5.5h-6.2A2.8 2.8 0 0 0 10 8.3V20c1.7-1 3.4-1.4 5.4-1.4H19V5.5Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
    case 'close':
      return (
        <svg {...p}>
          <path d="M7 7 17 17M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 8v4.2L15 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...p}>
          <path d="M6 16.5h12l-1.2-2.1V11a4.8 4.8 0 1 0-9.6 0v3.4L6 16.5Z" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 18.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      )
    case 'chevron':
      return (
        <svg {...p}>
          <path d="M9 6 15 12 9 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    default:
      return (
        <svg {...p}>
          <path d="M12 3 5 6.5v5.2c0 4.4 3 7.4 7 8.8 4-1.4 7-4.4 7-8.8V6.5L12 3Z" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
  }
}

export function Badge({ status }: { status: OppStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
}

export function Choice({
  selected,
  children,
  onClick,
  tone = 'default',
}: {
  selected?: boolean
  children: ReactNode
  onClick: () => void
  tone?: 'default' | 'muted'
}) {
  return (
    <button type="button" className={`choice ${selected ? 'is-on' : ''} ${tone === 'muted' ? 'is-muted' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function PrimaryBtn({
  children,
  onClick,
  disabled,
  block = true,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  block?: boolean
}) {
  return (
    <button type="button" className={`btn btn-primary ${block ? 'btn-block' : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function GhostBtn({
  children,
  onClick,
}: {
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <button type="button" className="btn btn-ghost btn-block" onClick={onClick}>
      {children}
    </button>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="notice">{children}</div>
}
