export interface PolicyRule {
  id: string
  title: string
  jurisdiction: string
  audience: string
  effectiveFrom: string
  effectiveTo: string
  reviewedAt: string
  reviewer: string
  sourceUrl: string
  sourceLabel: string
  notes: string
}

export const TODAY = '2026-09-27'

export const POLICIES: Record<string, PolicyRule> = {
  'TAX-SH-RENT-2026.03': {
    id: 'TAX-SH-RENT-2026.03',
    title: '住房租金专项附加扣除',
    jurisdiction: '全国框架 / 上海适用标准',
    audience: '在上海主要工作且租住住房的居民个人',
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31',
    reviewedAt: '2026-09-27',
    reviewer: '政策研究（初稿）',
    sourceUrl: 'https://shanghai.chinatax.gov.cn/zcfw/rdwd/202603/t479656.html',
    sourceLabel: '上海市税务局《住房租金专项附加扣除热点问答》',
    notes: '上海标准为每月 1500 元税前扣除额。与住房贷款利息扣除互斥。扣除额不是退税额。',
  },
  'PF-SH-MARKET-2024.10': {
    id: 'PF-SH-MARKET-2024.10',
    title: '市场租赁住房公积金提取',
    jurisdiction: '上海市',
    audience: '在上海缴存住房公积金并租赁市场住房的缴存人',
    effectiveFrom: '2024-10-01',
    effectiveTo: '2027-12-31',
    reviewedAt: '2026-09-27',
    reviewer: '政策研究（初稿）',
    sourceUrl:
      'https://zwdt.sh.gov.cn/govPortals/bsfw/item/d2f5ed71-c4a7-4b67-b627-1381279130c2',
    sourceLabel: '上海一网通办 · 市场租赁住房公积金提取办事指南',
    notes: '一般市场租赁每户月限额 4000 元。可提取额来自本人账户余额，不是财政补贴。',
  },
}

export const OFFICIAL = {
  taxApp: {
    label: '打开个人所得税 App / 电子税务局',
    url: 'https://etax.chinatax.gov.cn/',
  },
  pfGuide: {
    label: '上海一网通办 · 租赁提取办事指南',
    url: 'https://zwdt.sh.gov.cn/govPortals/bsfw/item/d2f5ed71-c4a7-4b67-b627-1381279130c2',
  },
  pfNotice: {
    label: '市公积金管委会租赁提取通知',
    url: 'https://service.shanghai.gov.cn/XingZhengWenDangKuJyhTest/XZGFDetails.aspx?docid=241015151102JbADRZpu6KkOIFz6TBv',
  },
}

export function isRuleActive(rule: PolicyRule, today = TODAY) {
  return today >= rule.effectiveFrom && today <= rule.effectiveTo
}

export function taxYearHint(today = TODAY) {
  const [, month] = today.split('-').map(Number)
  if (month >= 3 && month <= 6) {
    return '当前可能处于上一年度综合所得汇算清缴窗口。是否仍开放、能否补报，一律以个人所得税 App 和税务机关实时信息为准。本产品不代办、不承诺退税。'
  }
  return '2026 纳税年度仍在进行中。住房租金扣除可在个人所得税 App 填报，可能从后续预扣起享受。若工资预扣环节已经享受，年度汇算时不一定再有退税。汇算开放时间以税务机关为准。'
}
