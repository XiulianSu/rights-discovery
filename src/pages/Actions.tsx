import { Badge } from '../components/ui'
import { evaluate } from '../lib/evaluate'
import { navigate } from '../lib/router'
import { patchAction, setAction, useApp } from '../lib/store'
import { ACTION_LABEL, type ActionState, type OppId } from '../lib/types'

const STATES: ActionState[] = ['not_started', 'already_claimed', 'applied', 'completed', 'rejected']

export function Actions() {
  const app = useApp()
  const opps = evaluate({ profile: app.profile, actions: app.actions })

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">行动</p>
        <h1>办理进度</h1>
      </header>
      <div className="content tight">
        {opps.map((opp) => {
          const rec = app.actions[opp.id]
          return (
            <section key={opp.id} className="block">
              <div className="row-between">
                <div>
                  <h3 className="h3">{opp.title}</h3>
                  <p className="tiny">{ACTION_LABEL[rec.state]}</p>
                </div>
                <Badge status={opp.status} />
              </div>
              <div className="chip-row">
                {STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${rec.state === s ? 'on' : ''}`}
                    onClick={() => setAction(opp.id, s)}
                  >
                    {ACTION_LABEL[s]}
                  </button>
                ))}
              </div>
              <label className="field">
                <span>你核实到什么 / 卡在哪里</span>
                <textarea
                  rows={3}
                  value={rec.note}
                  placeholder="例如：个税 App 里已经有一条租金扣除。"
                  onChange={(e) => patchAction(opp.id as OppId, { note: e.target.value })}
                />
              </label>
              <label className="consent compact">
                <input
                  type="checkbox"
                  checked={rec.remind}
                  onChange={(e) => patchAction(opp.id, { remind: e.target.checked })}
                />
                <span>在相关时间窗口提醒我再看一次。演示只保存在本机，不发送真实通知。</span>
              </label>
              {rec.logs.length > 0 && (
                <ol className="logs">
                  {rec.logs.slice(-4).reverse().map((log, idx) => (
                    <li key={idx}>
                      {new Date(log.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {ACTION_LABEL[log.state]}
                    </li>
                  ))}
                </ol>
              )}
              <button type="button" className="text-link" onClick={() => navigate(`/opportunity/${opp.id}`)}>
                查看这条机会的条件
              </button>
            </section>
          )
        })}
      </div>
    </div>
  )
}
