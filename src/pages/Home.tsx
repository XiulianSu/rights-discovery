import { useState } from 'react'
import { Icon, PrimaryBtn } from '../components/ui'
import { navigate } from '../lib/router'
import { applyProfile, DEMOS, patchProfile, useApp } from '../lib/store'

export function Home() {
  const { profile } = useApp()
  const [consent, setConsent] = useState(profile.consent)
  const [openDemo, setOpenDemo] = useState(false)

  return (
    <div className="page home">
      <section className="hero">
        <p className="eyebrow">上海租房 · MVP</p>
        <h1>个人权益发现</h1>
        <p className="lead">一次租房，两套互不相关的规则。我们只帮你看清有没有漏掉，不代办、不登录政府系统。</p>
        <div className="hero-art" aria-hidden>
          <span className="blob a" />
          <span className="blob b" />
          <div className="hero-cards">
            <div className="mini-card">
              <Icon name="coin" size={18} />
              <div>
                <b>个税扣除</b>
                <small>少的是税基，不是现金</small>
              </div>
            </div>
            <div className="mini-card">
              <Icon name="house" size={18} />
              <div>
                <b>公积金提取</b>
                <small>取的是本人账户余额</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sheet">
        <ul className="points">
          <li>大约 5 分钟，可不上传文件</li>
          <li>结果只有「可能符合 / 需核实 / 明显不符合」</li>
          <li>两笔金额分开显示，绝不加总成「能领回」</li>
        </ul>

        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked)
              patchProfile({
                consent: e.target.checked,
                consentAt: e.target.checked ? new Date().toISOString() : '',
              })
            }}
          />
          <span>
            我了解这是信息提示，不是官方资格认定；本阶段只采集住房、租约、缴存和可选的工资数字，不索取身份证或银行卡号。
          </span>
        </label>

        <PrimaryBtn
          disabled={!consent}
          onClick={() => {
            patchProfile({ consent: true, consentAt: profile.consentAt || new Date().toISOString() })
            navigate('/gate')
          }}
        >
          开始检查
        </PrimaryBtn>
        <p className="tiny center">申请、申报和审核仍由你在官方渠道完成</p>
        <button type="button" className="text-link center" onClick={() => navigate('/policies')}>
          先看政策介绍
        </button>
      </section>

      <section className="demo-box">
        <button type="button" className="text-link" onClick={() => setOpenDemo((v) => !v)}>
          {openDemo ? '收起演示样本' : '演示样本（评审可直接看结果）'}
        </button>
        {openDemo && (
          <div className="demo-list">
            {Object.entries(DEMOS).map(([id, demo]) => (
              <button
                key={id}
                type="button"
                className="demo-item"
                onClick={() => {
                  applyProfile(demo.profile)
                  navigate('/discover')
                }}
              >
                <b>{demo.label}</b>
                <span>{demo.hint}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
