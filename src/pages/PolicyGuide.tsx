import { useMemo, useState } from 'react'
import { Icon } from '../components/ui'
import { getGuide, operableHint } from '../lib/guides'
import { navigate, parsePath, usePath } from '../lib/router'
import { addFeedback, setAlarm, useApp } from '../lib/store'
import type { GuideId } from '../lib/types'

export function PolicyGuide() {
  const { path } = parsePath(usePath())
  const id = (path.split('/').pop() || 'pf_rent') as GuideId
  const guide = getGuide(id)
  const app = useApp()
  const [openAlarm, setOpenAlarm] = useState(false)
  const [openFeedback, setOpenFeedback] = useState(false)
  const [days, setDays] = useState(guide?.defaultDays ?? 90)
  const [fb, setFb] = useState('')
  const [fbDone, setFbDone] = useState(false)
  const [alarmMsg, setAlarmMsg] = useState('')
  const [openSources, setOpenSources] = useState(false)

  const hint = useMemo(() => (guide ? operableHint(guide.id, app.profile) : null), [guide, app.profile])
  const alarm = guide ? app.alarms[guide.id] : undefined

  if (!guide || !hint) {
    return (
      <div className="page">
        <p className="content">没有这条政策。</p>
      </div>
    )
  }

  const current = guide

  async function enableAlarm() {
    setAlarm(current.id, days, true)
    setAlarmMsg(`已记下 ${days} 天后提醒。浏览器不能保证锁屏闹钟，建议同时在系统闹钟里设一次。`)
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${current.name} 提醒已设置`, {
          body: `${days} 天后检查是否可以去官方渠道操作。`,
        })
      }
    } catch {
      /* 演示环境允许没有系统通知 */
    }
  }

  return (
    <div className="page guide-page">
      <header className="guide-top">
        <h1>{guide.name}</h1>
        <button type="button" className="icon-btn" aria-label="关闭" onClick={() => navigate('/policies')}>
          <Icon name="close" />
        </button>
      </header>

      <div className={`guide-cover is-${guide.cover}`} aria-hidden>
        <Icon name={guide.cover === 'house' ? 'house' : 'file'} size={42} />
        <p>{guide.cover === 'house' ? '本人账户资金，不是补贴' : '税前扣除额，不是退税'}</p>
      </div>

      <section className="guide-intro">
        <h2>政策介绍</h2>
        <p>{guide.intro}</p>
      </section>

      <section className="guide-reviews">
        <h3>真实评价</h3>
        <article className="quote-card is-yes">
          <p className="quote-kicker">{guide.yesTitle}</p>
          <ol>
            {guide.yesPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
        <article className="quote-card is-no">
          <p className="quote-kicker">{guide.noTitle}</p>
          <ol>
            {guide.noPoints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>
      </section>

      <section className="guide-sources">
        <button type="button" className="source-toggle" onClick={() => setOpenSources((v) => !v)} aria-expanded={openSources}>
          <b>信息来源</b>
          <span>{guide.sources.length} 条</span>
          <i className={openSources ? 'is-open' : ''}>
            <Icon name="chevron" size={18} />
          </i>
        </button>
        {openSources &&
          guide.sources.map((src) =>
            src.url ? (
              <a key={src.name} className="source-row" href={src.url} target="_blank" rel="noreferrer">
                <SourceMeta src={src} />
              </a>
            ) : (
              <div key={src.name} className="source-row">
                <SourceMeta src={src} />
              </div>
            ),
          )}
      </section>

      <section className="guide-actions">
        <button type="button" className="setting-row" onClick={() => setOpenAlarm((v) => !v)}>
          <Icon name="clock" />
          <div>
            <b>{hint.label}</b>
            <span>
              {alarm?.enabled
                ? `已设闹钟，约 ${alarm.days} 天后提醒`
                : hint.days > 0
                  ? `大约 ${hint.days} 天后可再核对`
                  : '现在就可以去官方渠道核对'}
            </span>
          </div>
          <Icon name="bell" />
        </button>
        {openAlarm && (
          <div className="alarm-panel">
            <p>{hint.detail}</p>
            <label className="field">
              <span>多少天后提醒我</span>
              <input
                inputMode="numeric"
                value={String(days)}
                onChange={(e) => setDays(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <div className="chip-row">
              {[7, 30, 90, hint.days || 90].filter((n, i, arr) => arr.indexOf(n) === i && n > 0).map((n) => (
                <button key={n} type="button" className={`chip ${days === n ? 'on' : ''}`} onClick={() => setDays(n)}>
                  {n} 天
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={enableAlarm}>
              设置闹钟
            </button>
            {alarm?.enabled && (
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setAlarm(guide.id, days, false)}>
                关闭这只闹钟
              </button>
            )}
            {alarmMsg && <p className="tiny">{alarmMsg}</p>}
          </div>
        )}

        {guide.apps.map((appItem) => (
          <a key={appItem.name} className="setting-row" href={appItem.url} target="_blank" rel="noreferrer">
            <Icon name="link" />
            <div>
              <b>{appItem.name}</b>
              <span>{appItem.hint}</span>
            </div>
            <Icon name="chevron" />
          </a>
        ))}

        <button type="button" className="setting-row" onClick={() => setOpenFeedback((v) => !v)}>
          <Icon name="alert" />
          <div>
            <b>反馈问题</b>
            <span>规则过时、口径不准或入口失效，都可以告诉我们</span>
          </div>
          <Icon name="chevron" />
        </button>
        {openFeedback && (
          <div className="alarm-panel">
            <label className="field">
              <span>你发现了什么问题</span>
              <textarea rows={4} value={fb} onChange={(e) => setFb(e.target.value)} placeholder="例如：办事指南链接打不开，或社区说法和官网不一致。" />
            </label>
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!fb.trim()}
              onClick={() => {
                addFeedback(guide.id, fb.trim())
                setFb('')
                setFbDone(true)
              }}
            >
              提交反馈
            </button>
            {fbDone && <p className="tiny">已保存在本机，演示环境不会发到服务器。</p>}
          </div>
        )}
      </section>
    </div>
  )
}

function SourceMeta({ src }: { src: { name: string; kind: 'xhs' | 'gov'; note: string } }) {
  return (
    <>
      <i className={`src-dot is-${src.kind}`}>{src.kind === 'xhs' ? '书' : '官'}</i>
      <div>
        <b>{src.name}</b>
        <span>{src.note}</span>
      </div>
      <em>{src.kind === 'xhs' ? '来自小红书' : '来自官网'}</em>
    </>
  )
}
