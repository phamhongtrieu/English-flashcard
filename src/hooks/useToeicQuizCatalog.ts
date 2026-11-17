import { useEffect, useState } from 'react'
import { loadToeicQuizCatalog } from '../services/toeicQuizLoader'
import type { QuizCatalog } from '../types/toeicQuiz'

export function useToeicQuizCatalog() {
  const [state, setState] = useState<{ catalog: QuizCatalog | null; error: string | null; loading: boolean }>({ catalog: null, error: null, loading: true })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState({ catalog: null, error: null, loading: true })
    loadToeicQuizCatalog(controller.signal).then(catalog => {
      if (!controller.signal.aborted) setState({ catalog, error: null, loading: false })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ catalog: null, error: error instanceof Error ? error.message : 'Không tải được TOEIC.', loading: false })
    })
    return () => controller.abort()
  }, [revision])
  return { ...state, retry: () => setRevision(value => value + 1) }
}
