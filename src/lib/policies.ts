import { POLICY_RELEASE, policyActive, type PolicyRelease } from './policyRelease'

export interface PolicyRule {
  id: string
  title: string
  jurisdiction: string
  audience: string
  effectiveFrom: string
  effectiveTo: string
  reviewedAt: string
  reviewer: string
  releaseId: string
  sourceUrl: string
  sourceLabel: string
  notes: string
  taxYearFrom?: string
  taxYearTo?: string
}

export function systemAsOf(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function rulesFromRelease(release: PolicyRelease = POLICY_RELEASE): Record<string, PolicyRule> {
  const tax = release.rules.tax_rent
  const fund = release.rules.pf_rent
  return {
    [tax.id]: {
      id: tax.id,
      title: tax.title,
      jurisdiction: tax.jurisdiction,
      audience: tax.audience,
      effectiveFrom: tax.policy.from ?? '',
      effectiveTo: tax.policy.to ?? '',
      reviewedAt: release.reviewedAt,
      reviewer: release.reviewer,
      releaseId: release.releaseId,
      sourceUrl: tax.sourceUrl,
      sourceLabel: tax.sourceLabel,
      taxYearFrom: tax.taxYear.from ?? undefined,
      taxYearTo: tax.taxYear.to ?? undefined,
      notes: `上海标准为每月 ${tax.deductionMonthly} 元税前扣除额。与住房贷款利息扣除互斥。扣除额不是退税额。估算纳税年度与政策失效日不是同一条时间轴。`,
    },
    [fund.id]: {
      id: fund.id,
      title: fund.title,
      jurisdiction: fund.jurisdiction,
      audience: fund.audience,
      effectiveFrom: fund.policy.from ?? '',
      effectiveTo: fund.policy.to ?? '',
      reviewedAt: release.reviewedAt,
      reviewer: release.reviewer,
      releaseId: release.releaseId,
      sourceUrl: fund.sourceUrl,
      sourceLabel: fund.sourceLabel,
      notes: `一般市场租赁每户月限额 ${fund.monthlyCap} 元，自 ${fund.policy.from} 施行，有效期至 ${fund.policy.to}。${fund.branchNote}可提取额来自本人账户余额，不是财政补贴。`,
    },
  }
}

export const POLICIES = rulesFromRelease()

export const OFFICIAL = {
  taxApp: {
    label: '个人所得税 App / 电子税务局',
    url: 'https://etax.chinatax.gov.cn/',
  },
  pfGuide: {
    label: '上海一网通办 · 租赁提取办事指南',
    url: POLICY_RELEASE.rules.pf_rent.sourceUrl,
  },
  pfNotice: {
    label: POLICY_RELEASE.rules.pf_rent.noticeLabel,
    url: POLICY_RELEASE.rules.pf_rent.noticeUrl,
  },
}

export function isRuleActive(ruleId: 'tax_rent' | 'pf_rent', asOf = systemAsOf(), release: PolicyRelease = POLICY_RELEASE) {
  const rule = release.rules[ruleId]
  return policyActive(rule.policy, asOf, rule.reviewStatus)
}

export function taxYearHint(asOf = systemAsOf(), release: PolicyRelease = POLICY_RELEASE) {
  const [, month] = asOf.split('-').map(Number)
  const year = release.taxYear
  if (month >= 3 && month <= 6) {
    return '当前可能处于上一年度综合所得汇算清缴窗口。是否仍开放、能否补报，一律以个人所得税 App 和税务机关实时信息为准。本产品不代办、不承诺退税。'
  }
  return `${year} 纳税年度仍在进行中。住房租金扣除可在个人所得税 App 填报，可能从后续预扣起享受。若工资预扣环节已经享受，年度汇算时不一定再有退税。汇算开放时间以税务机关为准。`
}
