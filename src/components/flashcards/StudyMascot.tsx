import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useMascotWalk } from '../../hooks/useMascotWalk'
import { mascotMessages } from '../../data/mascotMessages'
import type { MascotState } from '../../data/mascotMessages'

/** Original inline vector illustration; no downloaded image or external asset. */
export function StudyMascot({ state, message }: { state: MascotState; message?: string }) {
  const [reacting, setReacting] = useState(state === 'correct' || state === 'incorrect')
  useEffect(() => { setReacting(state === 'correct' || state === 'incorrect') }, [state, message])
  const walk = useMascotWalk(state === 'idle' || (state === 'correct' && !reacting))
  const { reducedMotion } = walk
  const visualState = reacting ? state : state === 'correct' ? 'idle' : state
  return <aside className={`study-mascot mascot-${state}`} data-state={state} data-walking={walk.walking} data-direction={walk.walking && walk.right ? 'right' : 'left'} aria-label="Bạn đồng hành khủng long">
    <motion.p key={`${state}-${message ?? ''}`} className="mascot-bubble"
      initial={reducedMotion ? false : { opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.18 }}>
      {message ?? mascotMessages[state][0]}
    </motion.p>
    <div className="mascot-lane" aria-hidden="true"><div className="mascot-track">
    <motion.div className="mascot-walker" style={{ x: walk.x }}>
    <div className="mascot-facing" style={{ transform: `scaleX(${walk.walking && walk.right ? -1 : 1})` }}>
    <motion.div className="mascot-illustration" data-reacting={reacting}
      animate={{ y: reacting && state === 'correct' && !reducedMotion && walk.visible ? [0, -6, 0, -4, 0] : 0,
        rotate: reacting && state === 'incorrect' && !reducedMotion && walk.visible ? [0, -4, 4, -2, 0] : 0 }}
      transition={{ duration: reducedMotion || !walk.visible ? 0 : 0.7 }}
      onAnimationComplete={() => setReacting(false)}>
      <svg viewBox="0 0 160 150" fill="none" focusable="false">
        <ellipse cx="83" cy="139" rx="48" ry="6" fill="currentColor" opacity=".09" />
        <g stroke="var(--mascot-outline)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M105 108c16 6 31-1 37-16 4 19-7 37-31 35" fill="var(--mascot-body)" />
          <path d="m107 88 10 1-8 10m2 1 11 5-10 6" fill="var(--mascot-spikes)" />
          <path d="m77 28 5-12 10 13m1 6 11-7 2 16m-1 4 12-1-6 15" fill="var(--mascot-spikes)" />
          <path d="M61 76c-13 12-21 32-15 48 3 8 11 11 23 9l24 1c21 0 24-18 18-36l-9-30" fill="var(--mascot-body)" />
          <ellipse cx="76" cy="109" rx="19" ry="22" fill="var(--mascot-belly)" stroke="none" />
          <path d="M52 55c-1-19 9-31 26-31 22 0 33 16 29 36-2 15-14 25-32 24H49C31 84 25 76 27 64c1-9 13-12 25-9Z" fill="var(--mascot-body)" />
          <path d="M66 96c-5 8-11 8-15 4m45-5c3 6 8 8 11 4" />
          <path d="M57 126c-7-2-14 1-14 7 0 5 12 5 23 3m22-10c-5 3-6 8-3 10 4 3 16 2 24 0" fill="var(--mascot-body)" />
          <path d="M51 134v3m8-3v3m34-3v3m8-3v3" opacity=".5" />
          <ellipse cx="38" cy="64" rx="1.4" ry="2" fill="var(--mascot-outline)" stroke="none" />
          <ellipse cx="59" cy="71" rx="6" ry="3.5" fill="#e8a8c5" opacity=".7" stroke="none" />
          {visualState === 'correct' ? <>
            <path d="M68 53q4-7 8 0m10 0q4-7 8 0" />
            <path d="M68 67q10 13 20-1" fill="var(--mascot-belly)" />
          </> : <>
            <ellipse cx={state === 'typing' ? 70 : 73} cy="53" rx="2.8" ry="4" fill="var(--mascot-outline)" stroke="none" />
            <ellipse cx={state === 'typing' ? 87 : 90} cy="52" rx="2.8" ry="4" fill="var(--mascot-outline)" stroke="none" />
            {state === 'incorrect' ? <path d="m68 43 8 3m10 0 8-4m-23 29q6-5 12 0" />
              : <path d="M69 68q7 5 13-1" />}
          </>}
        </g>
        {visualState === 'correct' && <g className="mascot-sparkles" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
          <path d="M24 25v10m-5-5h10m99 11v8m-4-4h8m-12-29v6m-3-3h6" />
        </g>}
      </svg>
    </motion.div>
    </div></motion.div></div></div>
    <label className="mascot-motion-control"><input type="checkbox" role="switch" checked={walk.enabled}
      onChange={event => walk.setEnabled(event.target.checked)} />Bật/tắt chuyển động linh vật</label>
    {!walk.saved && <p className="mascot-storage-notice" role="status">Chưa thể lưu lựa chọn chuyển động.</p>}
  </aside>
}
