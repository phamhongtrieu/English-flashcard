import { Link } from 'react-router-dom'
export function DataState({ error }: { error?: string }) {
  return <div className="page-shell"><div className="notice" role={error ? 'alert' : 'status'}><p>{error ?? 'Đang tải dữ liệu Unit…'}</p></div>{error && <Link className="button button-secondary" to="/">Về danh sách Unit</Link>}</div>
}
