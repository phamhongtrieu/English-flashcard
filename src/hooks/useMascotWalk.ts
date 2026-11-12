import { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue } from 'motion/react'

export const MASCOT_MOTION_KEY = 'english-flashcard-mascot-motion-v1'

export function useMascotWalk(active: boolean) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const x = useMotionValue('0%')
  const targetRight = useRef(true)
  const [walking, setWalking] = useState(false)
  const [right, setRight] = useState(true)
  const [visible, setVisible] = useState(() => !document.hidden)
  const [preference, setPreference] = useState(() => {
    try { return { enabled: localStorage.getItem(MASCOT_MOTION_KEY) !== 'false', saved: true } }
    catch { return { enabled: true, saved: false } }
  })
  function setEnabled(enabled: boolean) {
    let saved = true
    try { localStorage.setItem(MASCOT_MOTION_KEY, String(enabled)) } catch { saved = false }
    setPreference({ enabled, saved })
  }
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    onChange()
    return () => media.removeEventListener('change', onChange)
  }, [])
  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (!active || !preference.enabled || reducedMotion || !visible) {
      setWalking(false)
      return
    }
    let canceled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let movement: ReturnType<typeof animate> | undefined
    function walk() {
      if (canceled) return
      const towardRight = targetRight.current
      setRight(towardRight)
      setWalking(true)
      // Percent travel is relative to a track exactly one character narrower
      // than the lane: resize keeps every frame within the reserved area.
      const position = Math.max(0, Math.min(100, parseFloat(x.get()) || 0))
      const distance = towardRight ? 100 - position : position
      movement = animate(x, towardRight ? '100%' : '0%', { duration: (8 + Math.random() * 4) * distance / 100, ease: 'linear' })
      movement.then(() => {
        if (canceled) return
        setWalking(false)
        targetRight.current = !towardRight
        timer = setTimeout(walk, 2000 + Math.random() * 2000)
      })
    }
    walk()
    return () => { canceled = true; movement?.stop(); if (timer !== undefined) clearTimeout(timer) }
  }, [active, preference.enabled, reducedMotion, visible, x])
  return { x, walking, right, reducedMotion, visible, ...preference, setEnabled }
}
