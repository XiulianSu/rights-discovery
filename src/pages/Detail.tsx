import { TopBar } from '../components/Shell'
import { Badge, Icon, PrimaryBtn } from '../components/ui'
import { evaluateOne } from '../lib/evaluate'
import { POLICIES } from '../lib/policies'
import { navigate, parsePath, usePath } from '../lib/router'
import { useApp } from '../lib/store'
import type { OppId, Opportunity } from '../lib/types'

export function Detail() {
  const { path } = parsePath(usePath())
  const id = (path.split('/').pop() || 'tax_rent') as OppId
  const { profile } = useApp()
  const opp = evaluateOne(profile, id === 'pf_rent' ? 'pf_rent' : 'tax_rent')
  const rule = POLICIES[opp.ruleId]

  return (
    <div className="page">
      <TopBar title="权益详情" onBack={() => navigate('/discover')} />
      <div className="content">
        <AmountMetrics opp={opp} />
        <div className="detail-hero">
          <Badge status={opp.status} />
          <h2>{opp.subtitle}</h2>
          <p>{opp.summary}</p>
        </div>

        <section className="block">
          <h4>为何是这个结果</h4>
          <ul className="cond-list">
            {opp.conditions.map((c) => (
              <li key={c.id} className={`cond is-${c.status}`}>
                <i />
                <div>
                  <b>
                    {c.status === 'met' ? '满足' : c.status === 'unmet' ? '不满足' : '待核实'} · {c.label}
                  </b>
                  <p>{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="block">
          <h4>金额怎么算</h4>
          <p className="body">{opp.id === 'tax_rent' ? opp.amount.taxSavingNote : opp.amount.fundNote}</p>
          {opp.id === 'tax_rent' && (
            <p className="tiny">示例：若确认可扣 12 个月，税前扣除额为 18,000 元，它不等于可退 18,000 元。</p>
          )}
        </section>

        <section className="block">
          <h4>办理前需要准备</h4>
          <ul className="plain">
            {opp.materials.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </section>

        <section className="block">
          <h4>规则版本</h4>
          <p className="body">
            {rule.title} · {rule.id}
            <br />
            适用 {rule.jurisdiction} · {rule.effectiveFrom} 至 {rule.effectiveTo}
            <br />
            复核 {rule.reviewedAt} · {rule.reviewer}
          </p>
          <a className="official" href={rule.sourceUrl} target="_blank" rel="noreferrer">
            <Icon name="link" size={16} />
            {rule.sourceLabel}
          </a>
        </section>

        <a className="official primary" href={opp.officialUrl} target="_blank" rel="noreferrer">
          <Icon name="link" size={16} />
          {opp.officialLabel}
        </a>
        <PrimaryBtn onClick={() => navigate('/actions')}>去记录办理进度</PrimaryBtn>
        <p className="tiny">跳转官方入口后，本产品不会自动登录、代填或提交。</p>
      </div>
    </div>
  )
}

function AmountMetrics({ opp }: { opp: Opportunity }) {
  const a = opp.amount
  if (opp.id === 'tax_rent') {
    return (
      <div className="metrics">
        <div>
          <span>税前扣除额</span>
          <strong>{a.deductionMonthly ? `${a.deductionMonthly.toLocaleString('zh-CN')} 元/月` : '—'}</strong>
        </div>
        <div>
          <span>可能少缴税额</span>
          <strong>
            {a.taxSavingLow != null && a.taxSavingHigh != null
              ? `${a.taxSavingLow.toLocaleString('zh-CN')}–${a.taxSavingHigh.toLocaleString('zh-CN')}`
              : '无法估算'}
          </strong>
        </div>
      </div>
    )
  }
  return (
    <div className="metrics">
      <div>
        <span>月限额口径</span>
        <strong>{a.fundMonthlyCap ? `${a.fundMonthlyCap.toLocaleString('zh-CN')} 元/户` : '需按分支核实'}</strong>
      </div>
      <div>
        <span>可提取上界</span>
        <strong>{a.fundUpper != null ? `${a.fundUpper.toLocaleString('zh-CN')} 元` : '无法估算'}</strong>
      </div>
    </div>
  )
}
