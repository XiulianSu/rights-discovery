import { useMemo, useState } from 'react'
import { PayslipField } from './Ask'
import { navigate } from '../lib/router'
import { resetAll, useApp } from '../lib/store'
import type { Profile } from '../lib/types'

const LABELS: { key: keyof Profile; label: string }[] = [
  { key: 'workCity', label: '主要工作城市' },
  { key: 'leaseStart', label: '起租月份' },
  { key: 'leaseEnd', label: '结束月份' },
  { key: 'ownHousing', label: '本人自有住房' },
  { key: 'marital', label: '婚姻状况' },
  { key: 'spouseOwnHousing', label: '配偶自有住房' },
  { key: 'housingLoanDeduction', label: '房贷利息扣除' },
  { key: 'alreadyFiledTax', label: '已填报租金扣除' },
  { key: 'spouseClaimed', label: '配偶已申报相关扣除' },
  { key: 'pfContinuous3Months', label: '连续缴存满三个月' },
  { key: 'leaseType', label: '租赁类型' },
  { key: 'alreadyExtracted', label: '已办理租房提取' },
  { key: 'monthlySalary', label: '当月税前工资' },
  { key: 'prepaidTax', label: '当月已预缴个税' },
  { key: 'monthlyRent', label: '每月租金' },
  { key: 'pfBalance', label: '公积金余额' },
]

function display(_key: keyof Profile, value: unknown) {
  const map: Record<string, string> = {
    yes: '是',
    no: '否',
    unknown: '未填',
    shanghai: '上海',
    other: '其他城市',
    single: '不涉及配偶',
    married: '已婚',
    market: '市场租赁',
    public: '公租房 / 保障性租赁',
  }
  if (value === '' || value == null) return '未填'
  if (typeof value === 'string' && map[value]) return map[value]
  if (typeof value === 'string') return value
  return '—'
}

function formatConsent(at: string) {
  return `已同意用途说明 · ${new Date(at).toLocaleString('zh-CN')}`
}

export function Docs() {
  const { profile, consentLogs } = useApp()
  const [openLogs, setOpenLogs] = useState(false)
  const logs = useMemo(
    () => [...consentLogs].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [consentLogs],
  )
  const latestAt = profile.consentAt || logs[0]?.at
  const latest = latestAt ? formatConsent(latestAt) : '尚未同意'
  const older = logs.filter((item) => item.at !== latestAt)

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">资料</p>
        <h1>个人信息</h1>
      </header>
      <div className="content tight">
        <section className="block">
          <h4>授权与删除</h4>
          <div className="btn-stack">
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={() => {
                if (confirm('确定撤回授权并删除本机全部数据？')) {
                  resetAll()
                  navigate('/')
                }
              }}
            >
              撤回授权并删除全部数据
            </button>
            <button
              type="button"
              className="btn btn-outline btn-block"
              aria-expanded={openLogs}
              onClick={() => setOpenLogs((v) => !v)}
            >
              过往授权记录
            </button>
          </div>
          {openLogs && (
            <ul className="consent-logs">
              {older.length === 0 ? (
                <li>暂无更早的授权记录</li>
              ) : (
                older.map((item) => <li key={item.at}>{formatConsent(item.at)}</li>)
              )}
            </ul>
          )}
          <p className="body">{latest}</p>
        </section>

        <section className="block">
          <h4>已提供信息</h4>
          <ul className="kv">
            {LABELS.map((row) => (
              <li key={row.key}>
                <span>{row.label}</span>
                <b>{display(row.key, profile[row.key])}</b>
              </li>
            ))}
          </ul>
          <button type="button" className="text-link" onClick={() => navigate('/ask')}>
            逐项更正
          </button>
        </section>

        <section className="block">
          <h4>工资单</h4>
          <PayslipField />
        </section>
      </div>
    </div>
  )
}
