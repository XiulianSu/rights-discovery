import type { GuideId, Profile } from './types'

export interface GuideSource {
  name: string
  kind: 'xhs' | 'gov'
  url?: string
  note: string
}

export interface GuideApp {
  name: string
  hint: string
  url: string
}

export interface PolicyGuide {
  id: GuideId
  name: string
  cover: 'house' | 'tax'
  intro: string
  yesTitle: string
  yesPoints: string[]
  noTitle: string
  noPoints: string[]
  sources: GuideSource[]
  apps: GuideApp[]
  defaultDays: number
}

export const GUIDES: PolicyGuide[] = [
  {
    id: 'pf_rent',
    name: '市场租赁住房公积金提取',
    cover: 'house',
    intro:
      '你账户里已经归属个人的住房公积金，在符合上海现行租赁提取规则时，可以申请提取一部分用于支付房租。它不是财政补贴，也不是和个税租金扣除可以加总的「能领回的钱」。是否批准、能提多少，以住房公积金中心审核为准。',
    yesTitle: '什么情况下，通常可以去申请提取',
    yesPoints: [
      '在上海连续缴存住房公积金满三个月',
      '本人及配偶在上海无自有住房',
      '租赁类型属于市场租赁等办事指南覆盖的情形',
      '没有与之冲突的其他生效提取业务',
      '能按指南准备租赁合同、支付凭证或核验材料',
    ],
    noTitle: '什么情况下，通常先不要当成「现在可提取」',
    noPoints: [
      '连续缴存还没满三个月',
      '本人或配偶在沪有自有住房',
      '已经办理过租房提取，或存在其他生效中的提取',
      '账户余额未知时，不要把「每户月限额 4,000 元」写成可领总额',
      '材料对不上当前办事指南分支，或规则已过期待复核',
    ],
    sources: [
      {
        name: '上海一网通办 · 市场租赁提取办事指南',
        kind: 'gov',
        url: 'https://zwdt.sh.gov.cn/govPortals/bsfw/item/d2f5ed71-c4a7-4b67-b627-1381279130c2',
        note: '城市提取条件以当地公积金中心现行指南为准',
      },
      {
        name: '市公积金管委会《关于优化本市住房公积金租赁提取业务相关事项的通知》',
        kind: 'gov',
        url: 'https://service.shanghai.gov.cn/XingZhengWenDangKuJyhTest/XZGFDetails.aspx?docid=241015151102JbADRZpu6KkOIFz6TBv',
        note: '一般市场租赁每户月限额等口径的官方来源',
      },
      {
        name: '「上海租房公积金 满三个月才能提」类笔记',
        kind: 'xhs',
        note: '社区里最常被提到的门槛是连续缴存月数，需再回官方指南核对',
      },
      {
        name: '「余额留给以后贷款 / 现在房租太贵先提出来」类讨论',
        kind: 'xhs',
        note: '提或不提多是现金流和未来购房资格的权衡，不是官方建议',
      },
    ],
    apps: [
      {
        name: '随申办 / 上海一网通办',
        hint: '查办事指南并跳转官方申请入口',
        url: 'https://zwdt.sh.gov.cn/govPortals/bsfw/item/d2f5ed71-c4a7-4b67-b627-1381279130c2',
      },
      {
        name: '上海公积金官方渠道',
        hint: '查询缴存月数、账户余额和提取进度',
        url: 'https://www.shgjj.com/',
      },
    ],
    defaultDays: 90,
  },
  {
    id: 'tax_rent',
    name: '住房租金专项附加扣除',
    cover: 'tax',
    intro:
      '在主要工作地为上海、实际租房且符合条件时，可以按每月 1,500 元减少应纳税所得额。这是税前扣除额，不是退税 1,500 元，更不是现金补贴。它和住房贷款利息扣除互斥，也和公积金提取互不相关，不能加总。',
    yesTitle: '什么情况下，通常可以去个税 App 填报',
    yesPoints: [
      '主要工作城市在上海，并且实际租住住房',
      '本人在主要工作城市无自有住房',
      '已婚时，配偶在该城市也无自有住房、未重复申报同类扣除',
      '没有同时选择住房贷款利息专项附加扣除',
      '尚未在个人所得税 App 填报住房租金扣除',
    ],
    noTitle: '什么情况下，不要理解成「现在可退税」',
    noPoints: [
      '本人或配偶在主要工作城市有自有住房',
      '已经选择了房贷利息扣除（二者互斥）',
      '已经在个税 App 填报过租金扣除',
      '把 12 个月 × 1,500 元当成能退 18,000 元',
      '工资预扣环节已经享受时，年度汇算不一定再有退税',
    ],
    sources: [
      {
        name: '上海市税务局《住房租金专项附加扣除热点问答》',
        kind: 'gov',
        url: 'https://shanghai.chinatax.gov.cn/zcfw/rdwd/202603/t479656.html',
        note: '上海每月 1,500 元税前扣除额的官方口径',
      },
      {
        name: '国家税务总局《个人所得税综合所得汇算清缴管理办法》',
        kind: 'gov',
        url: 'https://fgk.chinatax.gov.cn/zcfgk/c100011/c5238560/content.html',
        note: '汇算清缴路径以税务机关实时信息为准',
      },
      {
        name: '「租金扣除 1500 不是退 1500」类笔记',
        kind: 'xhs',
        note: '社区里误把扣除额当退税的说法很多，需要对照官方问答',
      },
      {
        name: '「和房贷利息能不能一起扣」类讨论',
        kind: 'xhs',
        note: '公开讨论普遍提到互斥，但仍以个税 App 当前规则为准',
      },
    ],
    apps: [
      {
        name: '个人所得税 App',
        hint: '填报专项附加扣除，核对是否已在预扣中享受',
        url: 'https://etax.chinatax.gov.cn/',
      },
      {
        name: '电子税务局',
        hint: '查询综合所得与汇算安排',
        url: 'https://etax.chinatax.gov.cn/',
      },
    ],
    defaultDays: 150,
  },
]

export function getGuide(id: string) {
  return GUIDES.find((g) => g.id === id)
}

export function daysUntil(isoDate: string, from = new Date()) {
  const target = new Date(`${isoDate}T00:00:00`)
  return Math.ceil((target.getTime() - from.getTime()) / 86400000)
}

export function operableHint(id: GuideId, profile: Profile) {
  if (id === 'pf_rent') {
    if (profile.pfContinuous3Months === 'yes') {
      return {
        days: 0,
        label: '按你的声明，缴存已满三个月',
        detail: '可以去官方渠道申请。是否通过、额度多少，以公积金中心审核为准。',
      }
    }
    if (profile.pfContinuous3Months === 'no') {
      return {
        days: 90,
        label: '大约还需满三个月缴存',
        detail: '按你的声明尚未满三个月。可先设提醒，到期后再核对准缴月数，不要提前理解成现在可提取。',
      }
    }
    return {
      days: 90,
      label: '一般需连续缴存满 90 天',
      detail: '是否已满三个月还未确认。上海市场租赁提取通常要求连续缴存满三个月。',
    }
  }

  const settle = daysUntil('2027-03-01')
  if (profile.alreadyFiledTax === 'yes') {
    return {
      days: Math.max(settle, 0),
      label: '已填报则关注次年汇算',
      detail: '你已填报租金扣除。是否已在预扣中享受，请打开个人所得税 App 核对；汇算窗口以税务机关为准。',
    }
  }
  return {
    days: 0,
    label: '本年度可在个税 App 填报',
    detail: `年度汇算一般在次年 3–6 月（距 2027-03-01 约 ${Math.max(settle, 0)} 天）。开放时间以税务机关为准，本产品不代办。`,
  }
}
