import { useMemo, useState } from 'react'
import { TopBar } from '../components/Shell'
import { Choice, GhostBtn, PrimaryBtn } from '../components/ui'
import { parsePath, navigate, usePath } from '../lib/router'
import { patchProfile, setAskedOnce, useApp } from '../lib/store'
import type { Profile } from '../lib/types'

type Q = {
  id: string
  title: string
  desc: string
  visible: (p: Profile) => boolean
}

const QUESTIONS: Q[] = [
  { id: 'workCity', title: '主要工作城市是？', desc: '住房租金扣除看主要工作地，不看户籍。本阶段按上海口径判断。', visible: () => true },
  { id: 'lease', title: '这套房子大概从哪月租到哪月？', desc: '用来估算覆盖月份。不确定可以先跳过，结果会标成需核实。', visible: () => true },
  { id: 'ownHousing', title: '你本人在主要工作城市有自有住房吗？', desc: '有自有住房时，租金扣除和租房提取通常都不符合。', visible: () => true },
  { id: 'marital', title: '目前的婚姻状况？', desc: '配偶住房和申报情况会改变两项结论。', visible: () => true },
  { id: 'spouseOwnHousing', title: '配偶在主要工作城市有自有住房吗？', desc: '家庭住房状况按你的声明判断，不会去政府系统核验。', visible: (p) => p.marital === 'married' },
  { id: 'housingLoanDeduction', title: '你是否已选择住房贷款利息专项附加扣除？', desc: '它和住房租金扣除互斥。选了房贷利息，不会提示「现在可退税」。', visible: () => true },
  { id: 'alreadyFiledTax', title: '是否已在个人所得税 App 填报住房租金扣除？', desc: '已经填报的，不再作为新发现的退税机会。', visible: () => true },
  { id: 'spouseClaimed', title: '配偶是否已申报住房租金或房贷利息扣除？', desc: '同一年度夫妻双方通常不能重复享受同类扣除。', visible: (p) => p.marital === 'married' },
  { id: 'pfContinuous3Months', title: '上海公积金是否已连续缴存满三个月？', desc: '未满三个月时，不能提示「现在可提取」。不确定请跳过。', visible: () => true },
  { id: 'leaseType', title: '租赁类型更接近哪一种？', desc: '市场租赁、公租房的材料和限额不同。选不准就跳过。', visible: () => true },
  { id: 'alreadyExtracted', title: '是否已经办理过住房公积金租房提取？', desc: '已办理或存在其他生效提取业务时，不再提示现在可提取。', visible: () => true },
  { id: 'money', title: '可选：补充数字，方便估算', desc: '都可以空着。没有已预缴税就不会给出精确少缴税额；没有公积金余额就不会写可领取总额。', visible: () => true },
]

export function Ask() {
  const { profile } = useApp()
  const { query } = parsePath(usePath())
  const list = useMemo(() => QUESTIONS.filter((q) => q.visible(profile)), [profile])
  const from = query.get('from')
  const start = Math.max(0, list.findIndex((q) => q.id === from))
  const [i, setI] = useState(start < 0 ? 0 : start)
  const q = list[Math.min(i, list.length - 1)]
  const last = i >= list.length - 1

  function finish() {
    setAskedOnce()
    navigate('/discover')
  }

  function next() {
    if (last) finish()
    else setI((n) => n + 1)
  }

  return (
    <div className="page">
      <TopBar
        title="补齐关键事实"
        onBack={() => (i === 0 ? navigate('/gate') : setI((n) => n - 1))}
        right={
          <button type="button" className="text-link" onClick={finish}>
            先看结果
          </button>
        }
      />
      <div className="progress">
        <i style={{ width: `${((i + 1) / list.length) * 100}%` }} />
      </div>
      <div className="content">
        <p className="kicker">
          {i + 1} / {list.length}
        </p>
        <h2 className="q-title">{q.title}</h2>
        <p className="q-desc">{q.desc}</p>
        <QuestionBody id={q.id} />
        <div className="footer-actions">
          <PrimaryBtn onClick={next}>{last ? '查看发现结果' : '下一项'}</PrimaryBtn>
          <GhostBtn onClick={next}>这题先跳过</GhostBtn>
        </div>
      </div>
    </div>
  )
}

function QuestionBody({ id }: { id: string }) {
  const { profile } = useApp()
  const p = profile

  if (id === 'workCity') {
    return (
      <div className="stack">
        <Choice selected={p.workCity === 'shanghai'} onClick={() => patchProfile({ workCity: 'shanghai' })}>
          上海
        </Choice>
        <Choice selected={p.workCity === 'other'} onClick={() => patchProfile({ workCity: 'other' })}>
          其他城市
        </Choice>
      </div>
    )
  }

  if (id === 'lease') {
    return (
      <div className="stack">
        <label className="field">
          <span>起租月份</span>
          <input type="month" value={p.leaseStart} onChange={(e) => patchProfile({ leaseStart: e.target.value })} />
        </label>
        <label className="field">
          <span>结束月份（未到期可空）</span>
          <input type="month" value={p.leaseEnd} onChange={(e) => patchProfile({ leaseEnd: e.target.value })} />
        </label>
      </div>
    )
  }

  if (id === 'ownHousing') {
    return (
      <YesNo value={p.ownHousing} onYes={() => patchProfile({ ownHousing: 'yes' })} onNo={() => patchProfile({ ownHousing: 'no' })} yes="有自有住房" no="没有自有住房" />
    )
  }

  if (id === 'marital') {
    return (
      <div className="stack">
        <Choice selected={p.marital === 'single'} onClick={() => patchProfile({ marital: 'single', spouseOwnHousing: 'unknown', spouseClaimed: 'unknown' })}>
          未婚 / 不涉及配偶
        </Choice>
        <Choice selected={p.marital === 'married'} onClick={() => patchProfile({ marital: 'married' })}>
          已婚
        </Choice>
      </div>
    )
  }

  if (id === 'spouseOwnHousing') {
    return (
      <YesNo value={p.spouseOwnHousing} onYes={() => patchProfile({ spouseOwnHousing: 'yes' })} onNo={() => patchProfile({ spouseOwnHousing: 'no' })} yes="配偶有自有住房" no="配偶没有" />
    )
  }

  if (id === 'housingLoanDeduction') {
    return (
      <YesNo value={p.housingLoanDeduction} onYes={() => patchProfile({ housingLoanDeduction: 'yes' })} onNo={() => patchProfile({ housingLoanDeduction: 'no' })} yes="已经选择房贷利息扣除" no="没有选择" />
    )
  }

  if (id === 'alreadyFiledTax') {
    return (
      <YesNo value={p.alreadyFiledTax} onYes={() => patchProfile({ alreadyFiledTax: 'yes' })} onNo={() => patchProfile({ alreadyFiledTax: 'no' })} yes="已经在个税 App 填报" no="还没有填报" />
    )
  }

  if (id === 'spouseClaimed') {
    return (
      <YesNo value={p.spouseClaimed} onYes={() => patchProfile({ spouseClaimed: 'yes' })} onNo={() => patchProfile({ spouseClaimed: 'no' })} yes="配偶已申报" no="配偶未申报" />
    )
  }

  if (id === 'pfContinuous3Months') {
    return (
      <YesNo value={p.pfContinuous3Months} onYes={() => patchProfile({ pfContinuous3Months: 'yes' })} onNo={() => patchProfile({ pfContinuous3Months: 'no' })} yes="已经满三个月" no="还没有满" />
    )
  }

  if (id === 'leaseType') {
    return (
      <div className="stack">
        <Choice selected={p.leaseType === 'market'} onClick={() => patchProfile({ leaseType: 'market' })}>
          市场租赁
        </Choice>
        <Choice selected={p.leaseType === 'public'} onClick={() => patchProfile({ leaseType: 'public' })}>
          公租房 / 保障性租赁
        </Choice>
        <Choice selected={p.leaseType === 'other'} onClick={() => patchProfile({ leaseType: 'other' })}>
          其他 / 不确定
        </Choice>
      </div>
    )
  }

  if (id === 'alreadyExtracted') {
    return (
      <YesNo value={p.alreadyExtracted} onYes={() => patchProfile({ alreadyExtracted: 'yes' })} onNo={() => patchProfile({ alreadyExtracted: 'no' })} yes="已经提取过" no="还没有办理" />
    )
  }

  return <MoneyFields />
}

function YesNo({
  value,
  onYes,
  onNo,
  yes,
  no,
}: {
  value: string
  onYes: () => void
  onNo: () => void
  yes: string
  no: string
}) {
  return (
    <div className="stack">
      <Choice selected={value === 'yes'} onClick={onYes}>
        {yes}
      </Choice>
      <Choice selected={value === 'no'} onClick={onNo}>
        {no}
      </Choice>
    </div>
  )
}

function MoneyFields() {
  const { profile } = useApp()

  return (
    <div className="stack">
      <label className="field">
        <span>当月税前工资（元，可选）</span>
        <input inputMode="decimal" placeholder="例如 22000" value={profile.monthlySalary} onChange={(e) => patchProfile({ monthlySalary: e.target.value })} />
      </label>
      <label className="field">
        <span>当月已预缴个税（元，可选）</span>
        <input inputMode="decimal" placeholder="例如 800" value={profile.prepaidTax} onChange={(e) => patchProfile({ prepaidTax: e.target.value })} />
      </label>
      <label className="field">
        <span>每月租金（元，可选）</span>
        <input inputMode="decimal" placeholder="例如 6500" value={profile.monthlyRent} onChange={(e) => patchProfile({ monthlyRent: e.target.value })} />
      </label>
      <label className="field">
        <span>公积金账户余额（元，可选）</span>
        <input inputMode="decimal" placeholder="不知道就留空" value={profile.pfBalance} onChange={(e) => patchProfile({ pfBalance: e.target.value })} />
      </label>
      <PayslipField />
    </div>
  )
}

export function PayslipField() {
  const { profile } = useApp()

  return (
    <div className="upload">
      <p>可选上传工资单。演示只保留文件名，请你手工核对工资和预缴税；身份证号、银行卡号请先自行遮蔽。</p>
      {profile.payslip ? (
        <div className="file-row">
          <span>{profile.payslip.name}</span>
          <button type="button" onClick={() => patchProfile({ payslip: null })}>
            删除文件
          </button>
        </div>
      ) : (
        <label className="file-btn">
          选择图片或 PDF
          <input
            type="file"
            accept="image/*,.pdf"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              patchProfile({
                payslip: { name: file.name, size: file.size, addedAt: new Date().toISOString() },
              })
            }}
          />
        </label>
      )}
    </div>
  )
}
