import { useSyncExternalStore } from 'react'

function currentPath() {
  const hash = window.location.hash.replace(/^#/, '')
  return hash || '/'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function usePath() {
  return useSyncExternalStore(subscribe, currentPath, () => '/')
}

export function navigate(to: string) {
  const next = to.startsWith('#') ? to.slice(1) : to
  if (!next.startsWith('/')) {
    window.location.hash = '/' + next
    return
  }
  window.location.hash = next
}

export function parsePath(path: string) {
  const [clean, qs] = path.split('?')
  const query = new URLSearchParams(qs ?? '')
  return { path: clean || '/', query }
}
