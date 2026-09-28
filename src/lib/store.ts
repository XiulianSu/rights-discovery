import { useSyncExternalStore } from 'react'
import type { ActionState, AppState, ConsentLog, FeedbackItem, GuideId, OppId, Profile } from './types'
import { emptyAction, emptyAlarm, emptyProfile } from './types'

const KEY = 'rights-discovery-mvp-20260927'

function seed(): AppState {
  return {
    profile: emptyProfile(),
    askedOnce: false,
    actions: {
      tax_rent: emptyAction(),
      pf_rent: emptyAction(),
    },
    alarms: {
      tax_rent: emptyAlarm(),
      pf_rent: emptyAlarm(),
    },
    feedbacks: [],
    consentLogs: [],
  }
}

function logFromProfile(profile: Profile): ConsentLog[] {
  if (!profile.consent || !profile.consentAt) return []
  return [{ at: profile.consentAt, label: '已同意用途说明' }]
}

function appendConsentLog(logs: ConsentLog[], at: string): ConsentLog[] {
  if (!at || logs.some((item) => item.at === at)) return logs
  return [...logs, { at, label: '已同意用途说明' }]
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seed()
    const parsed = JSON.parse(raw) as AppState
    return {
      ...seed(),
      ...parsed,
      profile: { ...emptyProfile(), ...parsed.profile },
      actions: {
        tax_rent: { ...emptyAction(), ...parsed.actions?.tax_rent },
        pf_rent: { ...emptyAction(), ...parsed.actions?.pf_rent },
      },
      alarms: {
        tax_rent: { ...emptyAlarm(), ...parsed.alarms?.tax_rent },
        pf_rent: { ...emptyAlarm(), ...parsed.alarms?.pf_rent },
      },
      feedbacks: parsed.feedbacks ?? [],
      consentLogs: parsed.consentLogs?.length ? parsed.consentLogs : logFromProfile({ ...emptyProfile(), ...parsed.profile }),
    }
  } catch {
    return seed()
  }
}

let state = load()
const listeners = new Set<() => void>()

function emit() {
  localStorage.setItem(KEY, JSON.stringify(state))
  listeners.forEach((l) => l())
}

export function getState() {
  return state
}

export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useApp() {
  return useSyncExternalStore(subscribe, getState, getState)
}

export function patchProfile(partial: Partial<Profile>) {
  const profile = { ...state.profile, ...partial }
  const consentAt = partial.consent === true ? partial.consentAt || profile.consentAt || new Date().toISOString() : profile.consentAt
  state = {
    ...state,
    profile: { ...profile, consentAt },
    consentLogs: partial.consent === true ? appendConsentLog(state.consentLogs, consentAt) : state.consentLogs,
  }
  emit()
}

export function setAskedOnce() {
  state = { ...state, askedOnce: true }
  emit()
}

export function setAction(id: OppId, next: ActionState, note?: string) {
  const prev = state.actions[id]
  const record = {
    ...prev,
    state: next,
    note: note ?? prev.note,
    logs: [
      ...prev.logs,
      { at: new Date().toISOString(), state: next, note: note ?? '' },
    ],
  }
  state = { ...state, actions: { ...state.actions, [id]: record } }
  emit()
}

export function patchAction(id: OppId, partial: { note?: string; remind?: boolean }) {
  state = {
    ...state,
    actions: { ...state.actions, [id]: { ...state.actions[id], ...partial } },
  }
  emit()
}

export function resetAll() {
  state = seed()
  localStorage.removeItem(KEY)
  emit()
}

export function applyProfile(profile: Profile, askedOnce = true) {
  state = { ...state, profile, askedOnce, consentLogs: logFromProfile(profile) }
  emit()
}

export function setAlarm(id: GuideId, days: number, enabled: boolean) {
  const fireAt = enabled ? new Date(Date.now() + days * 86400000).toISOString() : ''
  state = {
    ...state,
    alarms: { ...state.alarms, [id]: { enabled, days, fireAt } },
  }
  emit()
}

export function addFeedback(guideId: GuideId, text: string) {
  const item: FeedbackItem = {
    id: `${Date.now()}`,
    guideId,
    text,
    at: new Date().toISOString(),
  }
  state = { ...state, feedbacks: [...state.feedbacks, item] }
  emit()
}

export function dueAlarms(now = Date.now()) {
  return (Object.entries(state.alarms) as [GuideId, (typeof state.alarms)[GuideId]][]).filter(
    ([, alarm]) => alarm.enabled && alarm.fireAt && new Date(alarm.fireAt).getTime() <= now,
  )
}

export const DEMOS: Record<string, { label: string; hint: string; profile: Profile }> = {
  possible: {
    label: '可能符合（信息完整）',
    hint: '两项都进入可能符合，金额分开显示',
    profile: {
      ...emptyProfile(),
      rentingInShanghai: 'yes',
      workCity: 'shanghai',
      leaseStart: '2026-03',
      leaseEnd: '2026-12',
      ownHousing: 'no',
      marital: 'single',
      housingLoanDeduction: 'no',
      alreadyFiledTax: 'no',
      pfContinuous3Months: 'yes',
      leaseType: 'market',
      alreadyExtracted: 'no',
      monthlySalary: '22000',
      prepaidTax: '800',
      monthlyRent: '6500',
      pfBalance: '86000',
      consent: true,
      consentAt: '2026-09-27T10:00:00.000Z',
    },
  },
  filed: {
    label: '反例：已填报租金扣除',
    hint: '个税不得提示现在可退税',
    profile: {
      ...emptyProfile(),
      rentingInShanghai: 'yes',
      workCity: 'shanghai',
      leaseStart: '2026-01',
      leaseEnd: '2026-12',
      ownHousing: 'no',
      marital: 'single',
      housingLoanDeduction: 'no',
      alreadyFiledTax: 'yes',
      pfContinuous3Months: 'yes',
      leaseType: 'market',
      alreadyExtracted: 'no',
      consent: true,
      consentAt: '2026-09-27T10:00:00.000Z',
    },
  },
  house: {
    label: '反例：本人或配偶有自有住房',
    hint: '两项通常都不符合',
    profile: {
      ...emptyProfile(),
      rentingInShanghai: 'yes',
      workCity: 'shanghai',
      leaseStart: '2026-02',
      leaseEnd: '2026-12',
      ownHousing: 'yes',
      marital: 'married',
      spouseOwnHousing: 'yes',
      housingLoanDeduction: 'no',
      alreadyFiledTax: 'no',
      pfContinuous3Months: 'yes',
      leaseType: 'market',
      alreadyExtracted: 'no',
      consent: true,
      consentAt: '2026-09-27T10:00:00.000Z',
    },
  },
  loan: {
    label: '反例：已选房贷利息扣除',
    hint: '个税互斥；公积金仍可继续判断',
    profile: {
      ...emptyProfile(),
      rentingInShanghai: 'yes',
      workCity: 'shanghai',
      leaseStart: '2026-04',
      leaseEnd: '2026-12',
      ownHousing: 'no',
      marital: 'single',
      housingLoanDeduction: 'yes',
      alreadyFiledTax: 'no',
      pfContinuous3Months: 'yes',
      leaseType: 'market',
      alreadyExtracted: 'no',
      pfBalance: '42000',
      consent: true,
      consentAt: '2026-09-27T10:00:00.000Z',
    },
  },
  short: {
    label: '反例：公积金未满三个月',
    hint: '公积金不得提示现在可提取',
    profile: {
      ...emptyProfile(),
      rentingInShanghai: 'yes',
      workCity: 'shanghai',
      leaseStart: '2026-08',
      leaseEnd: '2027-07',
      ownHousing: 'no',
      marital: 'single',
      housingLoanDeduction: 'no',
      alreadyFiledTax: 'no',
      pfContinuous3Months: 'no',
      leaseType: 'market',
      alreadyExtracted: 'no',
      monthlySalary: '18000',
      prepaidTax: '500',
      consent: true,
      consentAt: '2026-09-27T10:00:00.000Z',
    },
  },
  unknown: {
    label: '信息不足 → 需核实',
    hint: '未知条件绝不默认为符合',
    profile: {
      ...emptyProfile(),
      rentingInShanghai: 'yes',
      workCity: 'shanghai',
      consent: true,
      consentAt: '2026-09-27T10:00:00.000Z',
    },
  },
}
