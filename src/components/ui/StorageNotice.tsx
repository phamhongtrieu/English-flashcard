import { useLearningProgress } from '../../hooks/useLearningProgress'
export function StorageNotice() {
  const { storageAvailable, invalidEntries } = useLearningProgress()
  if (!storageAvailable) return <div className="notice" role="alert"><p>Không thể lưu tiến độ đầy đủ trên trình duyệt này. Những đánh giá chưa lưu chỉ được giữ trong phiên hiện tại và sẽ mất khi tải lại trang. Hãy kiểm tra quyền lưu trữ hoặc dung lượng trình duyệt.</p></div>
  if (invalidEntries) return <div className="notice" role="alert"><p>Một số dữ liệu tiến độ không hợp lệ đã được bỏ qua. Những thẻ đó được xem là chưa học; tiến độ hợp lệ vẫn được giữ nguyên.</p></div>
  return null
}
