import { useContext } from 'react'
import { ProgressContext } from '../components/layout/ProgressProvider'

export function useLearningProgress() {
  const context = useContext(ProgressContext)
  if (!context) throw new Error('Thiếu ProgressProvider.')
  return context
}
