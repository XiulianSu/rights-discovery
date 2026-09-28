import { Icon } from '../components/ui'
import { GUIDES } from '../lib/guides'
import { navigate } from '../lib/router'
import { dueAlarms, useApp } from '../lib/store'

export function PolicyList() {
  const app = useApp()
  const due = dueAlarms()

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">政策list</p>
        <h1>政策介绍</h1>
      </header>
      <div className="content tight">
        {due.length > 0 && (
          <div className="alarm-banner">
            有 {due.length} 条操作提醒已到点。打开对应政策，可以关掉或改期。
          </div>
        )}
        {GUIDES.map((guide) => {
          const alarm = app.alarms[guide.id]
          return (
            <button key={guide.id} type="button" className="guide-card" onClick={() => navigate(`/policy/${guide.id}`)}>
              <div className={`guide-thumb is-${guide.cover}`} aria-hidden>
                <Icon name={guide.cover === 'house' ? 'house' : 'file'} size={28} />
              </div>
              <div className="guide-card-body">
                <b>{guide.name}</b>
                <span>{guide.intro.slice(0, 42)}…</span>
                {alarm.enabled && <em>已设闹钟 · {alarm.days} 天后提醒</em>}
              </div>
              <Icon name="chevron" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
