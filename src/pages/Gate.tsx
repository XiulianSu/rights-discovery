import { TopBar } from '../components/Shell'
import { Choice, Notice, PrimaryBtn } from '../components/ui'
import { navigate } from '../lib/router'
import { patchProfile, setAskedOnce, useApp } from '../lib/store'

export function Gate() {
  const { profile } = useApp()

  return (
    <div className="page">
      <TopBar title="先确认这件事" onBack={() => navigate('/')} />
      <div className="content">
        <p className="kicker">入口问题</p>
        <h2 className="q-title">你最近是否开始或继续在上海租房？</h2>
        <p className="q-desc">同一段租约可能同时牵涉个税住房租金扣除和公积金租房提取。两套规则独立，不要混成一笔钱。</p>

        <div className="stack">
          <Choice
            selected={profile.rentingInShanghai === 'yes'}
            onClick={() => patchProfile({ rentingInShanghai: 'yes', workCity: profile.workCity === 'unknown' ? 'shanghai' : profile.workCity })}
          >
            是，我在上海租房
          </Choice>
          <Choice
            selected={profile.rentingInShanghai === 'no'}
            onClick={() => patchProfile({ rentingInShanghai: 'no' })}
          >
            暂时不是
          </Choice>
        </div>

        {profile.rentingInShanghai === 'no' && (
          <Notice>
            第一阶段只覆盖「在上海工作、租房且缴存住房公积金」的场景。其他城市或社保待遇不在本次范围，不会被写成全国都查过。
          </Notice>
        )}

        {profile.rentingInShanghai === 'yes' && (
          <div className="footer-actions">
            <PrimaryBtn onClick={() => navigate('/ask')}>继续，一次只问一件事</PrimaryBtn>
            <button
              type="button"
              className="text-link center"
              onClick={() => {
                setAskedOnce()
                navigate('/discover')
              }}
            >
              先看结果，未知项记为需核实
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
