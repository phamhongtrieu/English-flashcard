import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
export function NotFoundPage() {
  return <div className="not-found"><span className="eyebrow">LẠC MỘT CHÚT THÔI</span><strong>404</strong><h1>Trang này chưa có trong bộ thẻ.</h1><p>Đường dẫn bạn truy cập không tồn tại.</p><Link className="button button-primary" to="/"><ArrowLeft size={18} />Về trang chủ</Link></div>
}
