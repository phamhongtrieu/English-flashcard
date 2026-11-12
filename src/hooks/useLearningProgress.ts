import { useEffect, useState } from 'react'
import { loadProgress, saveProgress } from '../utils/progress'

/** Chỉ đọc/khởi tạo tiến độ ở Bước 1; thao tác học sẽ được nối ở bước sau. */
export function useLearningProgress() {
  const [progress] = useState(loadProgress)
  const [storageAvailable, setStorageAvailable] = useState(true)
  useEffect(() => { setStorageAvailable(saveProgress(progress)) }, [progress])
  return { progress, storageAvailable }
}
