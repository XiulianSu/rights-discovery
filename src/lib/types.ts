export type Answer = 'yes' | 'no' | 'unknown'
export type WorkCity = 'shanghai' | 'other' | 'unknown'
export type Marital = 'single' | 'married' | 'unknown'
export type LeaseType = 'market' | 'public' | 'other' | 'unknown'
export type OppId = 'tax_rent' | 'pf_rent'
export type OppStatus = 'possible' | 'need_verify' | 'ineligible'
export type CondStatus = 'met' | 'unmet' | 'unknown'
export type ActionState = 'none' | 'verified' | 'applied' | 'received' | 'ineligible'

export interface PayslipFile {
  name: string
  size: number
  addedAt: string
}

export interface Profile {
  rentingInShanghai: Answer
  workCity: WorkCity
  leaseStart: string
  leaseEnd: string
  ownHousing: Answer
  marital: Marital
  spouseOwnHousing: Answer
  spouseClaimed: Answer
  housingLoanDeduction: Answer
  alreadyFiledTax: Answer
  pfContinuous3Months: Answer
  leaseType: LeaseType
  alreadyExtracted: Answer
  monthlySalary: string
  prepaidTax: string
  monthlyRent: string
  pfBalance: string
  payslip: PayslipFile | null
  consent: boolean
  consentAt: string
}

export interface Condition {
  id: string
  label: string
  status: CondStatus
  detail: string
  sourceId?: string
  blocking?: boolean
}

export interface AmountView {
  kind: 'tax' | 'fund'
  deductionMonthly?: number
  deductionPeriod?: number
  deductionTotal?: number
  taxSavingLow?: number
  taxSavingHigh?: number
  taxSavingNote: string
  fundMonthlyCap?: number
  fundUpper?: number
  fundNote: string
}

export interface Opportunity {
  id: OppId
  title: string
  subtitle: string
  status: OppStatus
  statusLabel: string
  summary: string
  conditions: Condition[]
  amount: AmountView
  ruleId: string
  officialUrl: string
  officialLabel: string
  materials: string[]
}

export interface ActionLog {
  at: string
  state: ActionState
  note: string
}

export interface ActionRecord {
  state: ActionState
  note: string
  remind: boolean
  logs: ActionLog[]
}

export type GuideId = 'pf_rent' | 'tax_rent'

export interface PolicyAlarm {
  enabled: boolean
  days: number
  fireAt: string
}

export interface FeedbackItem {
  id: string
  guideId: GuideId
  text: string
  at: string
}

export interface ConsentLog {
  at: string
  label: string
}

export interface AppState {
  profile: Profile
  askedOnce: boolean
  actions: Record<OppId, ActionRecord>
  alarms: Record<GuideId, PolicyAlarm>
  feedbacks: FeedbackItem[]
  consentLogs: ConsentLog[]
}

export const ACTION_LABEL: Record<ActionState, string> = {
  none: '尚未处理',
  verified: '我去核实了',
  applied: '已填报或申请',
  received: '已到账',
  ineligible: '不符合',
}

export const STATUS_LABEL: Record<OppStatus, string> = {
  possible: '可能符合',
  need_verify: '需核实',
  ineligible: '明显不符合',
}

export function emptyProfile(): Profile {
  return {
    rentingInShanghai: 'unknown',
    workCity: 'unknown',
    leaseStart: '',
    leaseEnd: '',
    ownHousing: 'unknown',
    marital: 'unknown',
    spouseOwnHousing: 'unknown',
    spouseClaimed: 'unknown',
    housingLoanDeduction: 'unknown',
    alreadyFiledTax: 'unknown',
    pfContinuous3Months: 'unknown',
    leaseType: 'unknown',
    alreadyExtracted: 'unknown',
    monthlySalary: '',
    prepaidTax: '',
    monthlyRent: '',
    pfBalance: '',
    payslip: null,
    consent: false,
    consentAt: '',
  }
}

export function emptyAction(): ActionRecord {
  return { state: 'none', note: '', remind: false, logs: [] }
}

export function emptyAlarm(): PolicyAlarm {
  return { enabled: false, days: 90, fireAt: '' }
}
