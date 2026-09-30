import { OFFICIAL, isRuleActive, systemAsOf, taxYearHint } from './policies'
import { POLICY_RELEASE, moneyLabel, type PolicyRelease } from './policyRelease'
import type {
  ActionRecord,
  ActionState,
  AmountView,
  Answer,
  Condition,
  EligibilityStatus,
  MissingFact,
  NextAction,
  OppId,
  OppStatus,
  Opportunity,
  Profile,
} from './types'
import { STATUS_LABEL } from './types'

export interface EvaluateInput {
  profile: Profile
  asOf?: string
  taxYear?: number
  policyRelease?: PolicyRelease
  actions?: Partial<Record<OppId, ActionRecord>>
}

interface Ctx {
  profile: Profile
  asOf: string
  taxYear: number
  release: PolicyRelease
  actions?: Partial<Record<OppId, ActionRecord>>
}

function isProfile(input: Profile | EvaluateInput): input is Profile {
  return !('profile' in input)
}

function normalize(input: Profile | EvaluateInput): Ctx {
  if (isProfile(input)) {
    return { profile: input, asOf: systemAsOf(), taxYear: POLICY_RELEASE.taxYear, release: POLICY_RELEASE }
  }
  const release = input.policyRelease ?? POLICY_RELEASE
  return {
    profile: input.profile,
    asOf: input.asOf ?? systemAsOf(),
    taxYear: input.taxYear ?? release.taxYear,
    release,
    actions: input.actions,
  }
}

function parseMoney(raw: string) {
  const n = Number(String(raw).replace(/[,，\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function parseYearMonth(v: string) {
  if (!v) return { ok: false as const, reason: 'missing' as const }
  const m = /^(\d{4})-(\d{2})$/.exec(v)
  if (!m) return { ok: false as const, reason: 'invalid' as const }
  const month = Number(m[2])
  if (month < 1 || month > 12) return { ok: false as const, reason: 'invalid' as const }
  return { ok: true as const, y: Number(m[1]), m: month }
}

export function leaseMonths(start: string, end: string, taxYear: number) {
  const from = parseYearMonth(start)
  const to = end ? parseYearMonth(end) : { ok: false as const, reason: 'missing' as const }
  if (!from.ok || !to.ok) {
    return { ok: false as const, reason: !from.ok ? from.reason : to.reason }
  }
  if (from.y > to.y || (from.y === to.y && from.m > to.m)) {
    return { ok: false as const, reason: 'order' as const }
  }
  const yearStart = { y: taxYear, m: 1 }
  const yearEnd = { y: taxYear, m: 12 }
  const a = from.y > yearStart.y || (from.y === yearStart.y && from.m >= yearStart.m) ? from : yearStart
  const b = to.y < yearEnd.y || (to.y === yearEnd.y && to.m <= yearEnd.m) ? to : yearEnd
  const n = (b.y - a.y) * 12 + (b.m - a.m) + 1
  if (n <= 0) return { ok: false as const, reason: 'order' as const }
  return { ok: true as const, months: n }
}

function estimateRate(annualIncome: number) {
  const taxable = Math.max(0, annualIncome - 60000)
  if (taxable <= 36000) return 0.03
  if (taxable <= 144000) return 0.1
  if (taxable <= 300000) return 0.2
  if (taxable <= 420000) return 0.25
  if (taxable <= 660000) return 0.3
  if (taxable <= 960000) return 0.35
  return 0.45
}

function yn(answer: Answer, yes: Omit<Condition, 'status'>, no: Omit<Condition, 'status'>): Condition {
  if (answer === 'yes') return { ...yes, status: 'met', answer: 'yes' }
  if (answer === 'no') return { ...no, status: 'unmet', answer: 'no' }
  return { ...yes, status: 'unknown', answer: 'unknown', detail: '你还没有确认这一项，不能默认为符合。' }
}

function eligibilityOf(conditions: Condition[], active: boolean): EligibilityStatus {
  if (!active) return 'policy_unverified'
  if (conditions.some((c) => c.status === 'unmet' && c.blocking)) return 'ineligible'
  if (conditions.some((c) => c.status === 'unknown' || c.status === 'unmet')) return 'need_verify'
  return 'possible'
}

function present(eligibility: EligibilityStatus, action: ActionState): OppStatus {
  if (eligibility === 'policy_unverified') return 'policy_unverified'
  if (eligibility === 'ineligible' || action === 'rejected') return 'ineligible'
  if (action === 'already_claimed' || action === 'applied' || action === 'completed') return 'claimed'
  return eligibility
}

function canEstimate(status: OppStatus) {
  return status === 'possible'
}

function blankTax(note: string, deductionMonthly: number): AmountView {
  return {
    kind: 'tax',
    amountType: 'none',
    personalEstimate: false,
    assumptions: [],
    deductionMonthly,
    taxSavingNote: note,
    fundNote: '',
  }
}

function blankFund(note: string, cap: number): AmountView {
  return {
    kind: 'fund',
    amountType: 'none',
    personalEstimate: false,
    assumptions: [],
    fundMonthlyCap: cap,
    fundNote: note,
    taxSavingNote: '',
  }
}

function taxAmount(ctx: Ctx, status: OppStatus): AmountView {
  const { profile: p, taxYear, release } = ctx
  const deductionMonthly = release.rules.tax_rent.deductionMonthly
  const lease = leaseMonths(p.leaseStart, p.leaseEnd, taxYear)
  const standard = `上海标准为每月 ${moneyLabel(deductionMonthly)} 元税前扣除额。这是政策一般口径，不是你的少缴税额。`

  if (!canEstimate(status)) {
    if (status === 'claimed') {
      return blankTax('这项已经填报或你已记录为办理中。这里不再估算新增少缴税额。', deductionMonthly)
    }
    if (status === 'policy_unverified') {
      return blankTax('规则已撤回、过期或待复核，已停止金额推荐。', deductionMonthly)
    }
    if (status === 'ineligible') {
      return blankTax('按你已确认的事实，这项明确不符。不会估算少缴税额。', deductionMonthly)
    }
    return blankTax(`还有事实没确认。${standard}未确认前不展示「少缴」数字。`, deductionMonthly)
  }

  if (!lease.ok) {
    return blankTax(
      lease.reason === 'missing'
        ? '租期还没填完整。不会按 12 个月或全年扣除额估算少缴税额。'
        : '租赁月份无法识别，或结束早于开始。这次不估算少缴税额。',
      deductionMonthly,
    )
  }

  const salary = parseMoney(p.monthlySalary)
  const prepaid = parseMoney(p.prepaidTax)
  const months = lease.months
  const deductionTotal = deductionMonthly * months
  if (!salary || !prepaid) {
    return {
      ...blankTax(
        `租期覆盖 ${months} 个月时，税前扣除额约为 ${moneyLabel(deductionTotal)} 元。没有工资和已预缴税额时，不估算少缴区间。扣除额不等于退税。`,
        deductionMonthly,
      ),
      amountType: 'deduction_base',
      deductionPeriod: months,
      deductionTotal,
    }
  }

  const rate = estimateRate(salary * 12)
  const low = Math.round(deductionTotal * 0.03)
  const high = Math.round(Math.min(deductionTotal * rate, prepaid * 12))
  if (high < low || low < 0 || high < 0) {
    return blankTax(
      '按单月已预缴税额年化后，上界低于最低档 3% 估算。这次不展示少缴区间，避免把一个月的预缴数字当成全年。请改填更接近全年的已预缴税额。',
      deductionMonthly,
    )
  }

  return {
    kind: 'tax',
    amountType: 'estimated_tax_saving',
    personalEstimate: true,
    assumptions: ['下界按扣除额的 3%', '上界取边际税率估算与单月预缴×12 的较低者', '未计入其他扣除'],
    deductionMonthly,
    deductionPeriod: months,
    deductionTotal,
    taxSavingLow: low,
    taxSavingHigh: high,
    taxSavingNote: `可能少缴约 ${moneyLabel(low)}–${moneyLabel(high)} 元。这是估算，不是退税额。若预扣已经享受该项扣除，汇算时不一定再退税。`,
    fundNote: '',
  }
}

function fundAmount(ctx: Ctx, status: OppStatus): AmountView {
  const { profile: p, taxYear, release } = ctx
  const cap = release.rules.pf_rent.monthlyCap
  const lease = leaseMonths(p.leaseStart, p.leaseEnd, taxYear)
  const months = lease.ok ? lease.months : undefined
  const standard = `一般市场租赁每户月限额 ${moneyLabel(cap)} 元，这不是你的可提取额。${release.rules.pf_rent.branchNote}`

  if (!canEstimate(status)) {
    if (status === 'claimed') return blankFund('这项已经办理，或存在你记录的申请进度。不再展示新增可提取额。', cap)
    if (status === 'policy_unverified') return blankFund('规则已撤回、过期或待复核，已停止金额推荐。', cap)
    if (status === 'ineligible') return blankFund('按你已确认的事实，这项明确不符。不会提示现在可提取。', cap)
    return blankFund(`还有事实没确认。${standard}`, cap)
  }

  if (p.leaseType !== 'market') {
    return blankFund('只有市场租赁才按通用月限额估算。其他租赁类型不输出可提取额。', cap)
  }
  if (!lease.ok || !months) {
    return blankFund(
      lease.ok
        ? standard
        : lease.reason === 'missing'
          ? `结束或开始月份还没填。不会用 12 个月或 ${moneyLabel(cap)} 元兜底。${standard}`
          : `租赁月份无法识别。不会用 ${moneyLabel(cap)} 元兜底。`,
      cap,
    )
  }

  const balance = parseMoney(p.pfBalance)
  if (balance == null) {
    return blankFund(`还没有公积金余额，不能把月限额乘月数写成可提取额。${standard}`, cap)
  }

  const rent = parseMoney(p.monthlyRent)
  const rentCap = rent ? rent * months : undefined
  const upper = Math.min(balance, cap * months, rentCap ?? Number.POSITIVE_INFINITY)
  return {
    kind: 'fund',
    amountType: 'owned_fund_access',
    personalEstimate: true,
    assumptions: ['取余额、月限额×覆盖月数、租金×覆盖月数中的较低者', '通用月限额不覆盖新市民、青年人等分支'],
    fundMonthlyCap: cap,
    deductionPeriod: months,
    fundUpper: Math.round(upper),
    fundNote: `可提取上界约 ${moneyLabel(Math.round(upper))} 元，是本人账户资金，不能和个税扣除相加。`,
    taxSavingNote: '',
  }
}

function missingFrom(conditions: Condition[], catalog: { id: string; key: string; title: string }[]): MissingFact[] {
  const unknown = new Set(conditions.filter((c) => c.status !== 'met').map((c) => c.id))
  return catalog
    .filter((item) => unknown.has(item.id))
    .map((item) => ({ key: item.key, title: item.title, path: `/ask?from=${item.key}` }))
}

function nextFor(status: OppStatus, missing: MissingFact[], official: { url: string; label: string }): NextAction {
  if (status === 'possible') return { label: '查看官方办理步骤', href: official.url }
  if (status === 'claimed') return { label: '查看记录', path: '/actions' }
  if (status === 'need_verify' && missing[0]) return { label: missing[0].title, path: missing[0].path }
  if (status === 'ineligible') return { label: '更正事实', path: missing[0]?.path ?? '/ask' }
  return { label: '查看依据', path: '/policies' }
}

function finish(
  partial: Omit<Opportunity, 'status' | 'statusLabel' | 'amount' | 'missingFacts' | 'nextAction' | 'evaluatedAt' | 'taxYear' | 'releaseId'> & {
    eligibilityStatus: EligibilityStatus
    actionStatus: ActionState
  },
  ctx: Ctx,
  catalog: { id: string; key: string; title: string }[],
  amount: AmountView,
  official: { url: string; label: string },
): Opportunity {
  const status = present(partial.eligibilityStatus, partial.actionStatus)
  const missingFacts = status === 'need_verify' || status === 'ineligible' ? missingFrom(partial.conditions, catalog) : []
  return {
    ...partial,
    status,
    statusLabel: STATUS_LABEL[status],
    amount,
    missingFacts,
    nextAction: nextFor(status, missingFacts, official),
    evaluatedAt: ctx.asOf,
    taxYear: ctx.taxYear,
    releaseId: ctx.release.releaseId,
  }
}

export function evaluate(input: Profile | EvaluateInput): Opportunity[] {
  const ctx = normalize(input)
  return [evaluateTax(ctx), evaluateFund(ctx)]
}

export function evaluateOne(input: Profile | EvaluateInput, id: OppId) {
  return evaluate(input).find((item) => item.id === id) ?? evaluate(input)[0]
}

function storedAction(ctx: Ctx, id: OppId, claimed: boolean): ActionState {
  if (claimed) return 'already_claimed'
  const stored = ctx.actions?.[id]?.state
  if (!stored || stored === 'not_started') return 'not_started'
  return stored
}

function evaluateTax(ctx: Ctx): Opportunity {
  const p = ctx.profile
  const rule = ctx.release.rules.tax_rent
  const active = isRuleActive('tax_rent', ctx.asOf, ctx.release)
  const conditions: Condition[] = []

  conditions.push(
    yn(
      p.rentingInShanghai,
      { id: 'renting', field: 'rentingInShanghai', label: '实际在上海租住住房', detail: '你确认最近开始或继续在上海租房。', sourceId: rule.id },
      { id: 'renting', field: 'rentingInShanghai', label: '实际在上海租住住房', detail: '当前入口只覆盖上海租房事件。', sourceId: rule.id, blocking: true },
    ),
  )

  if (p.workCity === 'shanghai') {
    conditions.push({ id: 'city', field: 'workCity', answer: 'shanghai', label: '主要工作城市为上海', status: 'met', detail: `住房租金扣除按主要工作地判断。上海月扣除标准 ${moneyLabel(rule.deductionMonthly)} 元。`, sourceId: rule.id })
  } else if (p.workCity === 'other') {
    conditions.push({ id: 'city', field: 'workCity', answer: 'other', label: '主要工作城市为上海', status: 'unmet', blocking: true, detail: '本阶段只按上海口径发现。其他城市标准不同。', sourceId: rule.id })
  } else {
    conditions.push({ id: 'city', field: 'workCity', answer: 'unknown', label: '主要工作城市为上海', status: 'unknown', detail: '主要工作地未确认。不能默认为上海。', sourceId: rule.id })
  }

  const lease = leaseMonths(p.leaseStart, p.leaseEnd, ctx.taxYear)
  conditions.push(
    lease.ok
      ? { id: 'lease-range', field: 'leaseStart', answer: `${p.leaseStart}/${p.leaseEnd}`, label: '租赁月份可以解析', status: 'met', detail: `${ctx.taxYear} 纳税年度内覆盖 ${lease.months} 个月。`, sourceId: rule.id }
      : { id: 'lease-range', field: 'leaseStart', answer: `${p.leaseStart}/${p.leaseEnd}`, label: '租赁月份可以解析', status: 'unknown', detail: lease.reason === 'missing' ? '起止月份还没填完整，不能按全年估算。' : '月份不合法，或结束早于开始。', sourceId: rule.id },
  )

  conditions.push(
    yn(
      p.ownHousing === 'no' ? 'yes' : p.ownHousing === 'yes' ? 'no' : 'unknown',
      { id: 'own', field: 'ownHousing', label: '本人在主要工作城市无自有住房', detail: '你确认本人在主要工作城市没有自有住房。', sourceId: rule.id },
      { id: 'own', field: 'ownHousing', label: '本人在主要工作城市无自有住房', detail: '本人在主要工作城市有自有住房时，通常不能享受住房租金扣除。', sourceId: rule.id, blocking: true },
    ),
  )

  if (p.marital === 'married') {
    conditions.push(
      yn(
        p.spouseOwnHousing === 'no' ? 'yes' : p.spouseOwnHousing === 'yes' ? 'no' : 'unknown',
        { id: 'spouse-own', field: 'spouseOwnHousing', label: '配偶在主要工作城市无自有住房', detail: '你确认配偶在该城市没有自有住房。', sourceId: rule.id },
        { id: 'spouse-own', field: 'spouseOwnHousing', label: '配偶在主要工作城市无自有住房', detail: '配偶在主要工作城市有自有住房时，住房租金扣除通常不符合。', sourceId: rule.id, blocking: true },
      ),
    )
    conditions.push(
      yn(
        p.spouseClaimed === 'no' ? 'yes' : p.spouseClaimed === 'yes' ? 'no' : 'unknown',
        { id: 'spouse-claim', field: 'spouseClaimed', label: '配偶未申报相关住房扣除', detail: '夫妻双方同一年度通常不能重复享受同类扣除。', sourceId: rule.id },
        { id: 'spouse-claim', field: 'spouseClaimed', label: '配偶未申报相关住房扣除', detail: '配偶如已申报同类扣除，本人再报可能重复。', sourceId: rule.id, blocking: true },
      ),
    )
  } else if (p.marital === 'unknown') {
    conditions.push({ id: 'marital', field: 'marital', answer: 'unknown', label: '婚姻与配偶住房情况', status: 'unknown', detail: '配偶是否有房、是否已申报，会改变结论。', sourceId: rule.id })
  }

  conditions.push(
    yn(
      p.housingLoanDeduction === 'no' ? 'yes' : p.housingLoanDeduction === 'yes' ? 'no' : 'unknown',
      { id: 'loan', field: 'housingLoanDeduction', label: '未选择住房贷款利息扣除', detail: '住房租金与住房贷款利息专项附加扣除互斥。', sourceId: rule.id },
      { id: 'loan', field: 'housingLoanDeduction', label: '未选择住房贷款利息扣除', detail: '已选择房贷利息扣除，不能同时按住房租金扣除。', sourceId: rule.id, blocking: true },
    ),
  )

  const filed = p.alreadyFiledTax === 'yes'
  conditions.push({
    id: 'filed',
    field: 'alreadyFiledTax',
    answer: p.alreadyFiledTax,
    label: '是否已在个税 App 填报',
    status: p.alreadyFiledTax === 'unknown' ? 'unknown' : 'met',
    detail: filed ? '你已填报。这是办理状态，不再当成新增收益。' : p.alreadyFiledTax === 'no' ? '你确认尚未填报。' : '还不知道是否已经填报，不能把它当成新机会。',
    sourceId: rule.id,
  })

  const eligibilityStatus = eligibilityOf(conditions, active)
  const actionStatus = storedAction(ctx, 'tax_rent', filed)
  const status = present(eligibilityStatus, actionStatus)
  const catalog = [
    { id: 'own', key: 'ownHousing', title: '确认本人在沪住房情况' },
    { id: 'spouse-own', key: 'spouseOwnHousing', title: '确认配偶在沪住房情况' },
    { id: 'city', key: 'workCity', title: '确认主要工作城市' },
    { id: 'lease-range', key: 'lease', title: '确认租赁起止月份' },
    { id: 'marital', key: 'marital', title: '确认婚姻状况' },
    { id: 'loan', key: 'housingLoanDeduction', title: '确认是否已选房贷利息扣除' },
    { id: 'filed', key: 'alreadyFiledTax', title: '确认是否已在个税 App 填报' },
    { id: 'spouse-claim', key: 'spouseClaimed', title: '确认配偶是否已申报' },
    { id: 'renting', key: 'workCity', title: '确认是否在上海租房' },
  ]

  return finish(
    {
      id: 'tax_rent',
      title: '个税情况',
      subtitle: '住房租金专项附加扣除',
      eligibilityStatus,
      actionStatus,
      summary: taxSummary(status, p),
      conditions,
      ruleId: rule.id,
      ruleVersionId: rule.id,
      officialUrl: OFFICIAL.taxApp.url,
      officialLabel: `官方渠道 · ${OFFICIAL.taxApp.label}`,
      materials: ['租赁合同或房租支付记录', '主要工作地与住房情况（本人、配偶）', '个人所得税 App 中的专项附加扣除填报页', '如需估算少缴税额：工资与已预缴个税'],
    },
    ctx,
    catalog,
    taxAmount(ctx, status),
    OFFICIAL.taxApp,
  )
}

function evaluateFund(ctx: Ctx): Opportunity {
  const p = ctx.profile
  const rule = ctx.release.rules.pf_rent
  const active = isRuleActive('pf_rent', ctx.asOf, ctx.release)
  const conditions: Condition[] = []

  conditions.push(
    yn(
      p.rentingInShanghai,
      { id: 'renting', field: 'rentingInShanghai', label: '在上海租赁住房', detail: '提取业务按上海公积金现行租赁提取规则判断。', sourceId: rule.id },
      { id: 'renting', field: 'rentingInShanghai', label: '在上海租赁住房', detail: '本阶段不覆盖非上海租赁。', sourceId: rule.id, blocking: true },
    ),
  )

  if (p.pfContributionCity === 'shanghai') {
    conditions.push({ id: 'city', field: 'pfContributionCity', answer: 'shanghai', label: '住房公积金在上海缴存', status: 'met', detail: '缴存城市按你的声明判断，不从工作城市推断。', sourceId: rule.id })
  } else if (p.pfContributionCity === 'other') {
    conditions.push({ id: 'city', field: 'pfContributionCity', answer: 'other', label: '住房公积金在上海缴存', status: 'unmet', blocking: true, detail: '缴存地不是上海时，不能套用上海市场租赁提取口径。', sourceId: rule.id })
  } else {
    conditions.push({ id: 'city', field: 'pfContributionCity', answer: 'unknown', label: '住房公积金在上海缴存', status: 'unknown', detail: '缴存城市还没确认。工作城市不能代替这一项。', sourceId: rule.id })
  }

  const lease = leaseMonths(p.leaseStart, p.leaseEnd, ctx.taxYear)
  conditions.push(
    lease.ok
      ? { id: 'lease-range', field: 'leaseStart', answer: `${p.leaseStart}/${p.leaseEnd}`, label: '租赁月份可以解析', status: 'met', detail: `覆盖 ${lease.months} 个月，只用于上界，不代表一定能提到这个数。`, sourceId: rule.id }
      : { id: 'lease-range', field: 'leaseStart', answer: `${p.leaseStart}/${p.leaseEnd}`, label: '租赁月份可以解析', status: 'unknown', detail: lease.reason === 'missing' ? '起止月份不完整，不能估算可提取额。' : '月份不合法，或结束早于开始。', sourceId: rule.id },
  )

  conditions.push(
    yn(
      p.pfContinuous3Months,
      { id: 'months3', field: 'pfContinuous3Months', label: '上海连续缴存满三个月', detail: '你确认已连续缴存满三个月。', sourceId: rule.id },
      { id: 'months3', field: 'pfContinuous3Months', label: '上海连续缴存满三个月', detail: '未满三个月时，不能提示现在可提取。', sourceId: rule.id, blocking: true },
    ),
  )

  conditions.push(
    yn(
      p.ownHousing === 'no' ? 'yes' : p.ownHousing === 'yes' ? 'no' : 'unknown',
      { id: 'own', field: 'ownHousing', label: '本人在沪无自有住房', detail: '你确认本人在上海没有自有住房。', sourceId: rule.id },
      { id: 'own', field: 'ownHousing', label: '本人在沪无自有住房', detail: '本人在沪有自有住房时，市场租赁提取通常不符合。', sourceId: rule.id, blocking: true },
    ),
  )

  if (p.marital === 'married') {
    conditions.push(
      yn(
        p.spouseOwnHousing === 'no' ? 'yes' : p.spouseOwnHousing === 'yes' ? 'no' : 'unknown',
        { id: 'spouse-own', field: 'spouseOwnHousing', label: '配偶在沪无自有住房', detail: '租赁提取一般按家庭住房情况判断。', sourceId: rule.id },
        { id: 'spouse-own', field: 'spouseOwnHousing', label: '配偶在沪无自有住房', detail: '配偶在沪有自有住房时，通常不能按市场租赁提取。', sourceId: rule.id, blocking: true },
      ),
    )
  } else if (p.marital === 'unknown') {
    conditions.push({ id: 'marital', field: 'marital', answer: 'unknown', label: '配偶在沪住房情况', status: 'unknown', detail: '家庭住房状况未确认，不能默认为符合。', sourceId: rule.id })
  }

  if (p.leaseType === 'market') {
    conditions.push({ id: 'lease', field: 'leaseType', answer: 'market', label: '租赁类型为市场租赁', status: 'met', detail: `按一般市场租赁每户月限额 ${moneyLabel(rule.monthlyCap)} 元的口径。${rule.branchNote}`, sourceId: rule.id })
  } else if (p.leaseType === 'unknown') {
    conditions.push({ id: 'lease', field: 'leaseType', answer: 'unknown', label: '租赁类型已确认', status: 'unknown', detail: '公租房和其他租赁的限额不同，不能默认为市场租赁。', sourceId: rule.id })
  } else {
    conditions.push({ id: 'lease', field: 'leaseType', answer: p.leaseType, label: '适用一般市场租赁口径', status: 'unknown', detail: '这个租赁类型需要按办事指南的其他分支核实，本阶段不估算金额。', sourceId: rule.id })
  }

  const extracted = p.alreadyExtracted === 'yes'
  conditions.push({
    id: 'extracted',
    field: 'alreadyExtracted',
    answer: p.alreadyExtracted,
    label: '是否已办理租房提取',
    status: p.alreadyExtracted === 'unknown' ? 'unknown' : 'met',
    detail: extracted ? '你已办理租房提取。这是办理状态，不再提示现在可提取。' : p.alreadyExtracted === 'no' ? '你确认还没有办理租房提取。' : '还不知道是否已经办理。',
    sourceId: rule.id,
  })

  conditions.push(
    yn(
      p.otherActiveExtraction === 'no' ? 'yes' : p.otherActiveExtraction === 'yes' ? 'no' : 'unknown',
      { id: 'conflict', field: 'otherActiveExtraction', label: '没有其他生效中的提取业务', detail: '这一项和「是否已办租房提取」分开确认。', sourceId: rule.id },
      { id: 'conflict', field: 'otherActiveExtraction', label: '没有其他生效中的提取业务', detail: '存在其他生效提取业务时，不再提示现在可提取。', sourceId: rule.id, blocking: true },
    ),
  )

  const eligibilityStatus = eligibilityOf(conditions, active)
  const actionStatus = storedAction(ctx, 'pf_rent', extracted)
  const status = present(eligibilityStatus, actionStatus)
  const catalog = [
    { id: 'own', key: 'ownHousing', title: '确认本人在沪住房情况' },
    { id: 'spouse-own', key: 'spouseOwnHousing', title: '确认配偶在沪住房情况' },
    { id: 'city', key: 'pfContributionCity', title: '确认公积金缴存城市' },
    { id: 'months3', key: 'pfContinuous3Months', title: '确认是否连续缴存满三个月' },
    { id: 'lease-range', key: 'lease', title: '确认租赁起止月份' },
    { id: 'lease', key: 'leaseType', title: '确认租赁类型' },
    { id: 'conflict', key: 'otherActiveExtraction', title: '确认有没有其他生效提取' },
    { id: 'extracted', key: 'alreadyExtracted', title: '确认是否已办理租房提取' },
    { id: 'marital', key: 'marital', title: '确认婚姻状况' },
  ]

  return finish(
    {
      id: 'pf_rent',
      title: '公积金情况',
      subtitle: '市场租赁住房公积金提取',
      eligibilityStatus,
      actionStatus,
      summary: fundSummary(status, p),
      conditions,
      ruleId: rule.id,
      ruleVersionId: rule.id,
      officialUrl: OFFICIAL.pfGuide.url,
      officialLabel: `官方渠道 · ${OFFICIAL.pfGuide.label}`,
      materials: ['本人及配偶身份与婚姻状况', '在沪无房证明或官方核验结果', '租赁合同 / 备案或支付凭证（按指南分支）', '上海公积金账户缴存与余额'],
    },
    ctx,
    catalog,
    fundAmount(ctx, status),
    OFFICIAL.pfGuide,
  )
}

function taxSummary(status: OppStatus, p: Profile) {
  if (status === 'claimed' || p.alreadyFiledTax === 'yes') return '你已填报租金扣除，这里不再估算新增少缴。'
  if (p.housingLoanDeduction === 'yes') return '已选择房贷利息扣除，与租金扣除互斥。'
  if (p.ownHousing === 'yes' || p.spouseOwnHousing === 'yes') return '本人或配偶在主要工作城市有自有住房，租金扣除通常不符合。'
  if (status === 'possible') return '关键条件已由你确认。仍需在个税 App 填报，结果以税务机关为准。'
  if (status === 'ineligible') return '按你已确认的事实，这项目前明确不符。'
  if (status === 'policy_unverified') return '这条规则需要复核，已停止金额建议。'
  return '还有关键事实未确认。未确认的条件不会被当成符合。'
}

function fundSummary(status: OppStatus, p: Profile) {
  if (status === 'claimed' || p.alreadyExtracted === 'yes') return '你已办理租房提取，这里不再估算新增可提取额。'
  if (p.otherActiveExtraction === 'yes') return '还有其他生效中的提取业务，不能提示现在可提取。'
  if (p.pfContinuous3Months === 'no') return '连续缴存尚未满三个月，不能提示现在可提取。'
  if (p.ownHousing === 'yes' || p.spouseOwnHousing === 'yes') return '本人或配偶在沪有自有住房，市场租赁提取通常不符合。'
  if (status === 'possible') return '关键条件已由你确认。提取申请与额度以公积金中心审核为准。'
  if (status === 'ineligible') return '按你已确认的事实，这项目前明确不符。'
  if (status === 'policy_unverified') return '这条规则需要复核，已停止金额建议。'
  return '住房、缴存城市或租期仍待确认。月限额不会被写成你的可提取额。'
}

export function nextUnknown(profile: Profile): MissingFact | null {
  const [tax, fund] = evaluate(profile)
  return tax.missingFacts[0] ?? fund.missingFacts[0] ?? null
}

export { systemAsOf, taxYearHint }
