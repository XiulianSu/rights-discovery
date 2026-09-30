import { Badge, Icon } from '../components/ui'
import { evaluate, nextUnknown, taxYearHint } from '../lib/evaluate'
import { POLICIES } from '../lib/policies'
import { navigate } from '../lib/router'
import { useApp } from '../lib/store'
import type { Opportunity } from '../lib/types'

export function Discover() {
  const { profile, actions } = useApp()
  const opps = evaluate({ profile, actions })
  const follow = nextUnknown(profile)

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">发现</p>
        <h1>租房权益</h1>
      </header>
      <div className="content tight">
        {opps.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}

        {follow && (
          <button type="button" className="follow-card" onClick={() => navigate(follow.path)}>
            <div>
              <p className="kicker">下一个待核实</p>
              <b>{follow.title}</b>
              <span>补上之后会立刻重算，未知项不会被当成符合。</span>
            </div>
            <Icon name="back" />
          </button>
        )}

        <div className="tip-card">{taxYearHint()}</div>
        <p className="tiny">本页结果不是税务机关或公积金中心的资格认定。政策复核日期 2026-09-27。</p>
      </div>
    </div>
  )
}

function headline(opp: Opportunity) {
  const a = opp.amount
  if (opp.status === 'possible' && a.personalEstimate) {
    if (a.taxSavingLow != null && a.taxSavingHigh != null) {
      const low = a.taxSavingLow.toLocaleString('zh-CN')
      const high = a.taxSavingHigh.toLocaleString('zh-CN')
      return low === high ? `少缴 ${low} 元` : `少缴 ${low}–${high} 元`
    }
    if (a.fundUpper != null) return `可提取 ${a.fundUpper.toLocaleString('zh-CN')} 元`
  }
  if (opp.status === 'possible') return '条件已确认，这次不展示个人金额'
  if (opp.status === 'claimed') return '已处理，不再估算新增金额'
  if (opp.status === 'policy_unverified') return '政策需复核，已停止金额建议'
  if (opp.status === 'ineligible') return opp.summary
  return opp.missingFacts[0]?.title ?? '还有事实需要确认'
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const rule = POLICIES[opp.ruleId]
  const action = opp.nextAction

  return (
    <article className={`opp-card is-${opp.status}`}>
      <p className="kicker">{opp.subtitle}</p>
      <Badge status={opp.status} />
      <strong className="opp-title">{headline(opp)}</strong>
      <p className="opp-summary">{opp.summary}</p>
      <div className="opp-foot">
        <span>{opp.releaseId}</span>
        <span>复核 {rule?.reviewedAt}</span>
      </div>
      <div className="card-actions">
        {action.href ? (
          <a href={action.href} target="_blank" rel="noreferrer">
            {action.label}
          </a>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => action.path && navigate(action.path)}>
            {action.label}
          </button>
        )}
        <button type="button" className="btn btn-outline" onClick={() => navigate(`/opportunity/${opp.id}`)}>
          查看依据
        </button>
      </div>
    </article>
  )
}
