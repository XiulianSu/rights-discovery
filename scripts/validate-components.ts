import { evaluate, systemAsOf } from '../src/lib/evaluate.ts'
import { GUIDES } from '../src/lib/guides.ts'
import { moneyLabel, POLICY_RELEASE } from '../src/lib/policyRelease.ts'
import { DEMOS } from '../src/lib/store.ts'

const strict = process.argv.includes('--strict')
const failures: string[] = []

function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}：${ok ? '通过' : '失败'}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures.push(name)
}

const possible = DEMOS.possible.profile
const both = evaluate(possible)
check(
  '完整样本，两项金额分开',
  both[0].status === 'possible' &&
    both[1].status === 'possible' &&
    both[0].amount.amountType !== both[1].amount.amountType &&
    both[0].amount.personalEstimate &&
    both[1].amount.personalEstimate,
  `${both[0].status}/${both[0].amount.amountType} · ${both[1].status}/${both[1].amount.amountType}`,
)

const unknownHousing = evaluate({ ...possible, ownHousing: 'unknown' })
check(
  '住房未知不被视为符合',
  unknownHousing.every((item) => item.eligibilityStatus === 'need_verify'),
  unknownHousing.map((item) => item.eligibilityStatus).join(','),
)
check(
  '资格需核实但仍输出金额',
  unknownHousing.every((item) => item.amount.taxSavingHigh == null && item.amount.fundUpper == null && !item.amount.personalEstimate),
  unknownHousing.map((item) => `tax=${item.amount.taxSavingHigh ?? '空'} fund=${item.amount.fundUpper ?? '空'}`).join('；'),
)

const taxFiled = evaluate(DEMOS.filed.profile).find((item) => item.id === 'tax_rent')!
check(
  '已填报租金扣除不再估算新增退税',
  taxFiled.actionStatus === 'already_claimed' && taxFiled.eligibilityStatus !== 'ineligible' && taxFiled.amount.taxSavingHigh == null,
  `资格 ${taxFiled.eligibilityStatus} · 办理 ${taxFiled.actionStatus} · 上界 ${taxFiled.amount.taxSavingHigh ?? '空'}`,
)

const short = evaluate(DEMOS.short.profile).find((item) => item.id === 'pf_rent')!
check(
  '未连续缴存三个月',
  short.eligibilityStatus === 'ineligible' && short.amount.fundUpper == null,
  `资格 ${short.eligibilityStatus} · 上界 ${short.amount.fundUpper ?? '空'}`,
)

const inverted = evaluate({ ...possible, prepaidTax: '1' }).find((item) => item.id === 'tax_rent')!
const low = inverted.amount.taxSavingLow
const high = inverted.amount.taxSavingHigh
check(
  '税额区间有序',
  (low == null && high == null) || (low != null && high != null && low <= high && !(low === 450 && high === 12)),
  low == null ? '区间已撤回，不展示倒置的 450–12' : `${low}–${high}`,
)

const badLease = evaluate({ ...possible, leaseStart: '2026-13', leaseEnd: '2026-14' })
check(
  '非法租约月份',
  badLease.every((item) => item.amount.fundUpper == null && item.amount.taxSavingHigh == null && item.status !== 'possible'),
  badLease.map((item) => `${item.id}:${item.status}/fund=${item.amount.fundUpper ?? '空'}`).join('；'),
)

const today = systemAsOf()
const runtime = evaluate(possible)[0]
const pinned = evaluate({ profile: possible, asOf: '2026-09-27' })[0]
const beforeFund = evaluate({ profile: possible, asOf: '2024-10-15' }).find((item) => item.id === 'pf_rent')!
check(
  '运行日期',
  runtime.evaluatedAt === today && pinned.evaluatedAt === '2026-09-27' && beforeFund.status === 'policy_unverified' && beforeFund.amount.fundUpper == null,
  `默认 ${runtime.evaluatedAt}，指定 ${pinned.evaluatedAt}，施行前 ${beforeFund.status}`,
)

const cap = POLICY_RELEASE.rules.pf_rent.monthlyCap
const guideText = GUIDES.map((guide) => `${guide.intro} ${guide.sources.map((src) => src.note).join(' ')}`).join('\n')
check('月限额只来自政策版本', both[1].amount.fundMonthlyCap === cap && guideText.includes(moneyLabel(cap)), `参数 ${cap}`)

const withdrawn = structuredClone(POLICY_RELEASE)
withdrawn.rules.tax_rent.reviewStatus = 'withdrawn'
withdrawn.rules.pf_rent.reviewStatus = 'withdrawn'
const closed = evaluate({ profile: possible, policyRelease: withdrawn })
check(
  '政策撤回后停止金额',
  closed.every((item) => item.status === 'policy_unverified' && !item.amount.personalEstimate),
  closed.map((item) => item.status).join(','),
)

if (failures.length) {
  console.error(`\n${failures.length} 项未通过：${failures.join('、')}`)
  if (strict) process.exit(1)
} else {
  console.log('\n全部探针通过')
}
