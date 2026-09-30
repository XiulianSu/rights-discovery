/**
 * 唯一的政策参数来源。月扣除额、月限额、施行区间和复核状态都从这里读。
 * 纳税年度、政策有效期、用户租期是三条时间轴，不能共用一个失效日。
 */
export type ReviewStatus = 'reviewed' | 'withdrawn'

export interface PolicyWindow {
  from: string | null
  to: string | null
}

export interface PolicyRelease {
  releaseId: string
  reviewedAt: string
  reviewer: string
  taxYear: number
  rules: {
    tax_rent: {
      id: string
      title: string
      deductionMonthly: number
      reviewStatus: ReviewStatus
      policy: PolicyWindow
      taxYear: PolicyWindow
      sourceUrl: string
      sourceLabel: string
      jurisdiction: string
      audience: string
    }
    pf_rent: {
      id: string
      title: string
      monthlyCap: number
      reviewStatus: ReviewStatus
      policy: PolicyWindow
      sourceUrl: string
      sourceLabel: string
      noticeUrl: string
      noticeLabel: string
      jurisdiction: string
      audience: string
      branchNote: string
    }
  }
}

export const POLICY_RELEASE: PolicyRelease = {
  releaseId: 'sh-rent-2026-09-27',
  reviewedAt: '2026-09-27',
  reviewer: '政策研究（初稿）',
  taxYear: 2026,
  rules: {
    tax_rent: {
      id: 'TAX-SH-RENT-2026.03',
      title: '住房租金专项附加扣除',
      deductionMonthly: 1500,
      reviewStatus: 'reviewed',
      policy: { from: null, to: null },
      taxYear: { from: '2026-01-01', to: '2026-12-31' },
      sourceUrl: 'https://shanghai.chinatax.gov.cn/zcfw/rdwd/202603/t479656.html',
      sourceLabel: '上海市税务局《住房租金专项附加扣除热点问答》',
      jurisdiction: '全国框架 / 上海适用标准',
      audience: '在上海主要工作且租住住房的居民个人',
    },
    pf_rent: {
      id: 'PF-SH-MARKET-2024.11',
      title: '市场租赁住房公积金提取',
      monthlyCap: 4000,
      reviewStatus: 'reviewed',
      policy: { from: '2024-11-01', to: '2029-10-31' },
      sourceUrl: 'https://zwdt.sh.gov.cn/govPortals/bsfw/item/d2f5ed71-c4a7-4b67-b627-1381279130c2',
      sourceLabel: '上海一网通办 · 市场租赁住房公积金提取办事指南',
      noticeUrl:
        'https://service.shanghai.gov.cn/XingZhengWenDangKuJyhTest/XZGFDetails.aspx?docid=241015151102JbADRZpu6KkOIFz6TBv',
      noticeLabel: '市公积金管委会《关于优化本市住房公积金租赁提取业务相关事项的通知》',
      jurisdiction: '上海市',
      audience: '在上海缴存住房公积金并租赁市场住房的缴存人',
      branchNote: '新市民、青年人等分支不适用这一通用月限额。',
    },
  },
}

export function policyActive(window: PolicyWindow, asOf: string, reviewStatus: ReviewStatus) {
  if (reviewStatus !== 'reviewed') return false
  if (window.from && asOf < window.from) return false
  if (window.to && asOf > window.to) return false
  return true
}

export function moneyLabel(n: number) {
  return n.toLocaleString('zh-CN')
}
