export type Answer = 'yes' | 'no' | 'unknown'
export type WorkCity = 'shanghai' | 'other' | 'unknown'
export type Marital = 'single' | 'married' | 'unknown'
export type LeaseType = 'market' | 'public' | 'other' | 'unknown'
export type OppId = 'tax_rent' | 'pf_rent'
export type EligibilityStatus = 'possible' | 'need_verify' | 'ineligible' | 'policy_unverified'
export type OppStatus = EligibilityStatus | 'claimed'
export type CondStatus = 'met' | 'unmet' | 'unknown'
export type ActionState = 'not_started' | 'already_claimed' | 'applied' | 'completed' | 'rejected'
export type AmountType = 'deduction_base' | 'estimated_tax_saving' | 'owned_fund_access' | 'none'

export interface PayslipFile {
  name: string
  size: number
  addedAt: string
}

export interface Profile {
  rentingInShanghai: Answer
  workCity: WorkCity
  pfContributionCity: WorkCity
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
  otherActiveExtraction: Answer
  monthlySalary: string
  prepaidTax: string
  monthlyRent: string
  pfBalance: string
  payslip: PayslipFile | null
  consent: boolean
  consentAt: string
  confirmedAt: Record<string, string>
}

export interface Condition {
  id: string
  field?: string
  answer?: string
  label: string
  status: CondStatus
  detail: string
  sourceId?: string
  blocking?: boolean
}

export interface AmountView {
  kind: 'tax' | 'fund'
  amountType: AmountType
  personalEstimate: boolean
  assumptions: string[]
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

export interface MissingFact {
  key: string
  title: string
  path: string
}

export interface NextAction {
  label: string
  path?: string
  href?: string
}

export interface Opportunity {
  id: OppId
  title: string
  subtitle: string
  eligibilityStatus: EligibilityStatus
  actionStatus: ActionState
  status: OppStatus
  statusLabel: string
  summary: string
  conditions: Condition[]
  missingFacts: MissingFact[]
  nextAction: NextAction
  amount: AmountView
  ruleId: string
  ruleVersionId: string
  releaseId: string
  evaluatedAt: string
  taxYear: number
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
  not_started: '尚未办理',
  already_claimed: '已办理',
  applied: '已申请',
  completed: '已办结',
  rejected: '确认不符合',
}

export const STATUS_LABEL: Record<OppStatus, string> = {
  possible: '可能符合',
  need_verify: '还需确认',
  ineligible: '明确不符',
  policy_unverified: '政策需复核',
  claimed: '已处理',
}

export function emptyProfile(): Profile {
  return {
    rentingInShanghai: 'unknown',
    workCity: 'unknown',
    pfContributionCity: 'unknown',
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
    otherActiveExtraction: 'unknown',
    monthlySalary: '',
    prepaidTax: '',
    monthlyRent: '',
    pfBalance: '',
    payslip: null,
    consent: false,
    consentAt: '',
    confirmedAt: {},
  }
}

export function emptyAction(): ActionRecord {
  return { state: 'not_started', note: '', remind: false, logs: [] }
}

export function emptyAlarm(): PolicyAlarm {
  return { enabled: false, days: 90, fireAt: '' }
}
