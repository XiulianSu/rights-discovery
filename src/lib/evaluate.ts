import { OFFICIAL, POLICIES, TODAY, isRuleActive, taxYearHint } from './policies'
import type {
  AmountView,
  Answer,
  Condition,
  OppStatus,
  Opportunity,
  Profile,
} from './types'
import { STATUS_LABEL } from './types'

function parseMoney(raw: string) {
  const n = Number(String(raw).replace(/[,，\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function monthsOverlap(start: string, end: string, year = 2026) {
  if (!start) return undefined
  const from = parseYearMonth(start)
  const to = end ? parseYearMonth(end) : { y: year, m: 9 }
  if (!from || !to) return undefined
  const yearStart = { y: year, m: 1 }
  const yearEnd = { y: year, m: 12 }
  const a = maxYm(from, yearStart)
  const b = minYm(to, yearEnd)
  const n = (b.y - a.y) * 12 + (b.m - a.m) + 1
  return n > 0 ? n : 0
}

function parseYearMonth(v: string) {
  const m = /^(\d{4})-(\d{2})$/.exec(v)
  if (!m) return undefined
  return { y: Number(m[1]), m: Number(m[2]) }
}

function maxYm(a: { y: number; m: number }, b: { y: number; m: number }) {
  return a.y > b.y || (a.y === b.y && a.m >= b.m) ? a : b
}

function minYm(a: { y: number; m: number }, b: { y: number; m: number }) {
  return a.y < b.y || (a.y === b.y && a.m <= b.m) ? a : b
}

function fold(conditions: Condition[]): OppStatus {
  if (conditions.some((c) => c.status === 'unmet' && c.blocking)) return 'ineligible'
  if (conditions.some((c) => c.status === 'unknown' || c.status === 'unmet')) {
    return 'need_verify'
  }
  return 'possible'
}

function yn(answer: Answer, yes: Omit<Condition, 'status'>, no: Omit<Condition, 'status'>): Condition {
  if (answer === 'yes') return { ...yes, status: 'met' }
  if (answer === 'no') return { ...no, status: 'unmet' }
  return { ...yes, status: 'unknown', detail: '你还没有确认这一项，不能默认为符合。' }
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

function taxAmount(p: Profile, ruleActive: boolean, status: OppStatus = 'need_verify'): AmountView {
  const months = monthsOverlap(p.leaseStart, p.leaseEnd)
  const salary = parseMoney(p.monthlySalary)
  const prepaid = parseMoney(p.prepaidTax)
  const deductionMonthly = 1500
  const deductionTotal = months ? deductionMonthly * months : undefined

  if (!ruleActive) {
    return {
      kind: 'tax',
      deductionMonthly,
      taxSavingNote: '规则已过期或待复核，已停止金额推荐。请先核对最新官方口径。',
      fundNote: '',
    }
  }

  if (status === 'ineligible') {
    return {
      kind: 'tax',
      deductionMonthly,
      taxSavingNote: '按你已确认的事实，这项明显不符合。上海标准仍是每月 1,500 元税前扣除额，但这里不会估算退税，也不会写成「现在可退税」。',
      fundNote: '',
    }
  }

  let taxSavingLow: number | undefined
  let taxSavingHigh: number | undefined
  let taxSavingNote =
    '上海标准为每月 1,500 元税前扣除额。它减少的是应纳税所得额，不等于可退 1,500 元，更不是现金补贴。'

  if (deductionTotal && salary && prepaid) {
    const rate = estimateRate(salary * 12)
    const raw = deductionTotal * rate
    const prepaidYear = prepaid * 12
    taxSavingLow = Math.round(deductionTotal * 0.03)
    taxSavingHigh = Math.round(Math.min(raw, prepaidYear))
    taxSavingNote = `按你提供的月工资与已预缴个税估算：可能少缴税额大约 ${taxSavingLow.toLocaleString('zh-CN')}–${taxSavingHigh.toLocaleString('zh-CN')} 元。若预扣环节已经享受该项扣除，可能没有额外退税。其他扣除未计入，仅供参考。`
  } else if (deductionTotal && salary) {
    const rate = estimateRate(salary * 12)
    taxSavingLow = Math.round(deductionTotal * 0.03)
    taxSavingHigh = Math.round(deductionTotal * rate)
    taxSavingNote =
      '已按工资粗估税率区间，但缺少已预缴税额，不能输出精确退税额。请不要把税前扣除额当成能领回的钱。'
  } else if (months) {
    taxSavingNote = `若租期覆盖 ${months} 个月，税前扣除额约为 ${(deductionMonthly * months).toLocaleString('zh-CN')} 元。没有全年收入和已预缴税信息时，不估算少缴税额。`
  } else {
    taxSavingNote =
      '租期未确认，暂不按全年 18,000 元估算。请先补齐租赁月份；即便补齐，扣除额也不等于退税。'
  }

  return {
    kind: 'tax',
    deductionMonthly,
    deductionPeriod: months,
    deductionTotal,
    taxSavingLow,
    taxSavingHigh,
    taxSavingNote,
    fundNote: '',
  }
}

function fundAmount(p: Profile, ruleActive: boolean, status: OppStatus = 'need_verify'): AmountView {
  const months = monthsOverlap(p.leaseStart, p.leaseEnd)
  const balance = parseMoney(p.pfBalance)
  const rent = parseMoney(p.monthlyRent)
  const cap = p.leaseType === 'public' ? undefined : 4000

  if (!ruleActive) {
    return {
      kind: 'fund',
      fundNote: '规则已过期或待复核，已停止金额推荐。请先核对上海公积金中心现行办事指南。',
      taxSavingNote: '',
    }
  }

  if (status === 'ineligible') {
    return {
      kind: 'fund',
      fundMonthlyCap: cap ?? 4000,
      fundNote: '按你已确认的事实，这项明显不符合。不会提示「现在可提取」，也不把月限额写成可领金额。',
      taxSavingNote: '',
    }
  }

  if (p.leaseType === 'public' || p.leaseType === 'other') {
    return {
      kind: 'fund',
      fundMonthlyCap: cap,
      fundNote: '特殊租赁或公租房适用不同限额与材料，本阶段不估算金额。请以办事指南分支为准。',
      taxSavingNote: '',
    }
  }

  if (balance == null) {
    return {
      kind: 'fund',
      fundMonthlyCap: 4000,
      deductionPeriod: months,
      fundNote:
        '需先查询本人住房公积金账户余额。一般市场租赁每户月限额 4,000 元，但没有余额时不会展示「可领取 48,000 元」。可提取的是你账户里已经归属个人的资金，不是补贴。',
      taxSavingNote: '',
    }
  }

  const rentCap = rent && months ? rent * months : undefined
  const policyCap = months ? 4000 * months : 4000
  const upper = Math.min(balance, policyCap, rentCap ?? Number.POSITIVE_INFINITY)

  return {
    kind: 'fund',
    fundMonthlyCap: 4000,
    deductionPeriod: months,
    fundUpper: Math.round(upper),
    fundNote: months
      ? `保守可提取上界约 ${Math.round(upper).toLocaleString('zh-CN')} 元，取实际租金、账户余额与每户月限额 4,000 元中的较低者。这是本人账户资金，不能和个税扣除相加。`
      : `已知账户余额 ${balance.toLocaleString('zh-CN')} 元。租期未确认时，只提示余额与月限额，不按 12 个月放大。`,
    taxSavingNote: '',
  }
}

export function evaluate(profile: Profile): Opportunity[] {
  return [evaluateTax(profile), evaluateFund(profile)]
}

export function evaluateOne(profile: Profile, id: Opportunity['id']) {
  return id === 'tax_rent' ? evaluateTax(profile) : evaluateFund(profile)
}

function evaluateTax(p: Profile): Opportunity {
  const rule = POLICIES['TAX-SH-RENT-2026.03']
  const active = isRuleActive(rule)
  const conditions: Condition[] = []

  conditions.push(
    yn(
      p.rentingInShanghai,
      {
        id: 'renting',
        label: '实际在上海租住住房',
        detail: '你确认最近开始或继续在上海租房。',
        sourceId: rule.id,
      },
      {
        id: 'renting',
        label: '实际在上海租住住房',
        detail: '当前入口只覆盖上海租房事件。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  if (p.workCity === 'shanghai') {
    conditions.push({
      id: 'city',
      label: '主要工作城市为上海',
      status: 'met',
      detail: '住房租金扣除按主要工作地标准判断，上海为每月 1,500 元。',
      sourceId: rule.id,
    })
  } else if (p.workCity === 'other') {
    conditions.push({
      id: 'city',
      label: '主要工作城市为上海',
      status: 'unmet',
      blocking: true,
      detail: '本阶段只按上海口径发现。其他城市标准不同，不能套用 1,500 元/月。',
      sourceId: rule.id,
    })
  } else {
    conditions.push({
      id: 'city',
      label: '主要工作城市为上海',
      status: 'unknown',
      detail: '主要工作地未确认。扣除标准随城市变化，不能默认为上海。',
      sourceId: rule.id,
    })
  }

  conditions.push(
    yn(
      p.ownHousing === 'no' ? 'yes' : p.ownHousing === 'yes' ? 'no' : 'unknown',
      {
        id: 'own',
        label: '本人在主要工作城市无自有住房',
        detail: '你确认本人在主要工作城市没有自有住房。',
        sourceId: rule.id,
      },
      {
        id: 'own',
        label: '本人在主要工作城市无自有住房',
        detail: '本人在主要工作城市有自有住房时，通常不能同时享受住房租金扣除。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  if (p.marital === 'married') {
    conditions.push(
      yn(
        p.spouseOwnHousing === 'no' ? 'yes' : p.spouseOwnHousing === 'yes' ? 'no' : 'unknown',
        {
          id: 'spouse-own',
          label: '配偶在主要工作城市无自有住房',
          detail: '你确认配偶在该城市没有自有住房。',
          sourceId: rule.id,
        },
        {
          id: 'spouse-own',
          label: '配偶在主要工作城市无自有住房',
          detail: '配偶在主要工作城市有自有住房时，住房租金扣除通常不符合。',
          sourceId: rule.id,
          blocking: true,
        },
      ),
    )
    conditions.push(
      yn(
        p.spouseClaimed === 'no' ? 'yes' : p.spouseClaimed === 'yes' ? 'no' : 'unknown',
        {
          id: 'spouse-claim',
          label: '配偶未申报相关住房扣除',
          detail: '夫妻双方同一年度通常只能选择一套住房类专项附加扣除口径。',
          sourceId: rule.id,
        },
        {
          id: 'spouse-claim',
          label: '配偶未申报相关住房扣除',
          detail: '配偶如已申报住房租金或房贷利息扣除，本人再报可能重复或互斥，需先在个税 App 核对。',
          sourceId: rule.id,
          blocking: true,
        },
      ),
    )
  } else if (p.marital === 'unknown') {
    conditions.push({
      id: 'marital',
      label: '婚姻与配偶住房情况',
      status: 'unknown',
      detail: '配偶是否有房、是否已申报，会改变结论。未确认前不能视为符合。',
      sourceId: rule.id,
    })
  }

  conditions.push(
    yn(
      p.housingLoanDeduction === 'no' ? 'yes' : p.housingLoanDeduction === 'yes' ? 'no' : 'unknown',
      {
        id: 'loan',
        label: '未选择住房贷款利息扣除',
        detail: '住房租金与住房贷款利息专项附加扣除互斥。',
        sourceId: rule.id,
      },
      {
        id: 'loan',
        label: '未选择住房贷款利息扣除',
        detail: '你已选择房贷利息扣除，不能同时按住房租金扣除，也不会提示「现在可退税」。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  conditions.push(
    yn(
      p.alreadyFiledTax === 'no' ? 'yes' : p.alreadyFiledTax === 'yes' ? 'no' : 'unknown',
      {
        id: 'filed',
        label: '尚未在个税 App 填报租金扣除',
        detail: '本次发现的是尚未完成的填报动作，而不是已经享受过的扣除。',
        sourceId: rule.id,
      },
      {
        id: 'filed',
        label: '尚未在个税 App 填报租金扣除',
        detail: '你已填报住房租金扣除。产品不再提示「现在可退税」；是否已在预扣中享受，请到个税 App 核对。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  if (!active) {
    conditions.push({
      id: 'rule',
      label: '政策规则在有效期内',
      status: 'unmet',
      blocking: true,
      detail: `规则 ${rule.id} 已过期，已停止金额推荐。`,
      sourceId: rule.id,
    })
  } else {
    conditions.push({
      id: 'rule',
      label: '政策规则在有效期内',
      status: 'met',
      detail: `依据日期 ${rule.reviewedAt}，规则 ${rule.id}。`,
      sourceId: rule.id,
    })
  }

  const status = fold(conditions)
  const amount = taxAmount(p, active, status)
  return {
    id: 'tax_rent',
    title: '个税情况',
    subtitle: '住房租金专项附加扣除',
    status,
    statusLabel: STATUS_LABEL[status],
    summary: taxSummary(status, p),
    conditions,
    amount,
    ruleId: rule.id,
    officialUrl: OFFICIAL.taxApp.url,
    officialLabel: OFFICIAL.taxApp.label,
    materials: [
      '租赁合同或房租支付记录',
      '主要工作地与住房情况（本人、配偶）',
      '个人所得税 App 中的专项附加扣除填报页',
      '如需估算少缴税额：工资与已预缴个税',
    ],
  }
}

function evaluateFund(p: Profile): Opportunity {
  const rule = POLICIES['PF-SH-MARKET-2024.10']
  const active = isRuleActive(rule)
  const conditions: Condition[] = []

  conditions.push(
    yn(
      p.rentingInShanghai,
      {
        id: 'renting',
        label: '在上海租赁住房',
        detail: '提取业务按上海公积金中心现行租赁提取规则判断。',
        sourceId: rule.id,
      },
      {
        id: 'renting',
        label: '在上海租赁住房',
        detail: '本阶段不覆盖非上海租赁。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  if (p.workCity === 'other') {
    conditions.push({
      id: 'city',
      label: '在上海缴存住房公积金',
      status: 'unmet',
      blocking: true,
      detail: '公积金模块还需在上海缴存。跨城市规则不在本阶段。',
      sourceId: rule.id,
    })
  } else if (p.workCity === 'unknown') {
    conditions.push({
      id: 'city',
      label: '在上海缴存住房公积金',
      status: 'unknown',
      detail: '是否在上海缴存尚未确认。',
      sourceId: rule.id,
    })
  } else {
    conditions.push({
      id: 'city',
      label: '在上海缴存住房公积金',
      status: 'met',
      detail: '按上海缴存口径继续判断。',
      sourceId: rule.id,
    })
  }

  conditions.push(
    yn(
      p.pfContinuous3Months,
      {
        id: 'months3',
        label: '上海连续缴存满三个月',
        detail: '你确认已连续缴存满三个月。',
        sourceId: rule.id,
      },
      {
        id: 'months3',
        label: '上海连续缴存满三个月',
        detail: '尚未满足连续缴存满三个月时，不能提示「现在可提取」。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  const selfNoHouse = p.ownHousing === 'no' ? 'yes' : p.ownHousing === 'yes' ? 'no' : 'unknown'
  conditions.push(
    yn(
      selfNoHouse,
      {
        id: 'own',
        label: '本人在沪无自有住房',
        detail: '你确认本人在上海没有自有住房。',
        sourceId: rule.id,
      },
      {
        id: 'own',
        label: '本人在沪无自有住房',
        detail: '本人在沪有自有住房时，市场租赁提取通常不符合。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  if (p.marital === 'married') {
    const spouseNo = p.spouseOwnHousing === 'no' ? 'yes' : p.spouseOwnHousing === 'yes' ? 'no' : 'unknown'
    conditions.push(
      yn(
        spouseNo,
        {
          id: 'spouse-own',
          label: '配偶在沪无自有住房',
          detail: '租赁提取一般按家庭住房情况判断。',
          sourceId: rule.id,
        },
        {
          id: 'spouse-own',
          label: '配偶在沪无自有住房',
          detail: '配偶在沪有自有住房时，通常不能按市场租赁提取。',
          sourceId: rule.id,
          blocking: true,
        },
      ),
    )
  } else if (p.marital === 'unknown') {
    conditions.push({
      id: 'marital',
      label: '配偶在沪住房情况',
      status: 'unknown',
      detail: '家庭住房状况未确认，不能默认为符合。',
      sourceId: rule.id,
    })
  }

  if (p.leaseType === 'market') {
    conditions.push({
      id: 'lease',
      label: '租赁类型为市场租赁',
      status: 'met',
      detail: '按一般市场租赁每户月限额 4,000 元的口径估算上界。',
      sourceId: rule.id,
    })
  } else if (p.leaseType === 'unknown') {
    conditions.push({
      id: 'lease',
      label: '租赁类型已确认',
      status: 'unknown',
      detail: '公租房、单位租赁房与市场租赁的材料和限额不同。',
      sourceId: rule.id,
    })
  } else {
    conditions.push({
      id: 'lease',
      label: '适用一般市场租赁口径',
      status: 'unknown',
      detail: '你选择的租赁类型需按办事指南其他分支核实，本阶段不直接判定可提取。',
      sourceId: rule.id,
    })
  }

  conditions.push(
    yn(
      p.alreadyExtracted === 'no' ? 'yes' : p.alreadyExtracted === 'yes' ? 'no' : 'unknown',
      {
        id: 'extracted',
        label: '尚未办理租房提取 / 无冲突提取业务',
        detail: '本次发现的是尚未申请的提取机会。',
        sourceId: rule.id,
      },
      {
        id: 'extracted',
        label: '尚未办理租房提取 / 无冲突提取业务',
        detail: '你已办理租房提取，或可能存在其他生效中的提取业务。不再提示「现在可提取」。',
        sourceId: rule.id,
        blocking: true,
      },
    ),
  )

  if (!active) {
    conditions.push({
      id: 'rule',
      label: '政策规则在有效期内',
      status: 'unmet',
      blocking: true,
      detail: `规则 ${rule.id} 已过期，已停止金额推荐。`,
      sourceId: rule.id,
    })
  } else {
    conditions.push({
      id: 'rule',
      label: '政策规则在有效期内',
      status: 'met',
      detail: `依据日期 ${rule.reviewedAt}，规则 ${rule.id}。`,
      sourceId: rule.id,
    })
  }

  const status = fold(conditions)
  const amount = fundAmount(p, active, status)
  return {
    id: 'pf_rent',
    title: '公积金情况',
    subtitle: '市场租赁住房公积金提取',
    status,
    statusLabel: STATUS_LABEL[status],
    summary: fundSummary(status, p),
    conditions,
    amount,
    ruleId: rule.id,
    officialUrl: OFFICIAL.pfGuide.url,
    officialLabel: OFFICIAL.pfGuide.label,
    materials: [
      '本人及配偶身份与婚姻状况',
      '在沪无房证明或官方核验结果',
      '租赁合同 / 备案或支付凭证（按指南分支）',
      '上海公积金账户缴存与余额',
    ],
  }
}

function taxSummary(status: OppStatus, p: Profile) {
  if (p.alreadyFiledTax === 'yes') return '你已填报租金扣除，这里不会写成「现在可退税」。'
  if (p.housingLoanDeduction === 'yes') return '已选择房贷利息扣除，与租金扣除互斥。'
  if (p.ownHousing === 'yes' || p.spouseOwnHousing === 'yes') {
    return '本人或配偶在主要工作城市有自有住房，租金扣除通常不符合。'
  }
  if (status === 'possible') return '关键条件已由你确认。仍需在个税 App 完成填报，结果以税务机关为准。'
  if (status === 'ineligible') return '按你已确认的事实，这项目前明显不符合，不会提示现在可退税。'
  return '还有关键事实未确认。未确认的条件一律记为需核实，不会默认为符合。'
}

function fundSummary(status: OppStatus, p: Profile) {
  if (p.alreadyExtracted === 'yes') return '你已办理租房提取，这里不会写成「现在可提取」。'
  if (p.pfContinuous3Months === 'no') return '连续缴存尚未满三个月，不能提示现在可提取。'
  if (p.ownHousing === 'yes' || p.spouseOwnHousing === 'yes') {
    return '本人或配偶在沪有自有住房，市场租赁提取通常不符合。'
  }
  if (status === 'possible') return '关键条件已由你确认。提取申请与额度以公积金中心审核为准。'
  if (status === 'ineligible') return '按你已确认的事实，这项目前明显不符合，不会提示现在可提取。'
  return '账户余额、家庭住房或缴存月数仍待核实，不会把限额直接写成可领金额。'
}

export function nextUnknown(profile: Profile): { key: string; title: string; path: string } | null {
  const order: { when: boolean; key: string; title: string }[] = [
    { when: profile.workCity === 'unknown', key: 'workCity', title: '主要工作城市还没确认' },
    { when: !profile.leaseStart, key: 'lease', title: '租赁起止月还没填' },
    { when: profile.ownHousing === 'unknown', key: 'ownHousing', title: '本人在沪是否有自有住房' },
    { when: profile.marital === 'unknown', key: 'marital', title: '婚姻状况还没确认' },
    {
      when: profile.marital === 'married' && profile.spouseOwnHousing === 'unknown',
      key: 'spouseOwnHousing',
      title: '配偶在沪是否有自有住房',
    },
    { when: profile.housingLoanDeduction === 'unknown', key: 'housingLoanDeduction', title: '是否选择了房贷利息扣除' },
    { when: profile.alreadyFiledTax === 'unknown', key: 'alreadyFiledTax', title: '是否已在个税 App 填报' },
    {
      when: profile.marital === 'married' && profile.spouseClaimed === 'unknown',
      key: 'spouseClaimed',
      title: '配偶是否已申报相关扣除',
    },
    { when: profile.pfContinuous3Months === 'unknown', key: 'pfContinuous3Months', title: '公积金是否连续缴存满三个月' },
    { when: profile.leaseType === 'unknown', key: 'leaseType', title: '租赁类型还没选择' },
    { when: profile.alreadyExtracted === 'unknown', key: 'alreadyExtracted', title: '是否已经办理租房提取' },
  ]
  const hit = order.find((x) => x.when)
  return hit ? { ...hit, path: `/ask?from=${hit.key}` } : null
}

export { taxYearHint, TODAY }
