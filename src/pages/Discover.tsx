import { Icon } from '../components/ui'
import { evaluate, nextUnknown, taxYearHint } from '../lib/evaluate'
import { POLICIES } from '../lib/policies'
import { navigate } from '../lib/router'
import { useApp } from '../lib/store'
import type { Opportunity } from '../lib/types'

export function Discover() {
  const { profile } = useApp()
  const opps = evaluate(profile)
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
  if (opp.id === 'tax_rent') {
    if (a.taxSavingLow != null && a.taxSavingHigh != null) {
      const low = a.taxSavingLow.toLocaleString('zh-CN')
      const high = a.taxSavingHigh.toLocaleString('zh-CN')
      return low === high ? `少缴 ${low} 元` : `少缴 ${low}–${high} 元`
    }
    return '无法估算少缴金额'
  }
  if (a.fundUpper != null) return `可提取 ${a.fundUpper.toLocaleString('zh-CN')} 元`
  return '无法估算可提取金额'
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const missing = opp.conditions.filter((c) => c.status !== 'met').length
  const rule = POLICIES[opp.ruleId]

  return (
    <button
      type="button"
      className={`opp-card is-${opp.status}`}
      onClick={() => navigate(`/opportunity/${opp.id}`)}
    >
      <p className="kicker">{opp.subtitle}</p>
      <strong className="opp-title">{headline(opp)}</strong>
      <div className="opp-foot">
        <span>{missing ? `${missing} 项待核实或不满足` : '关键条件已确认'}</span>
        <span>依据 {rule?.reviewedAt}</span>
      </div>
    </button>
  )
}
