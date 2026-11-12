import { BarChart3, BookOpen, House, Layers3, Moon, Sun, ArrowUpRight } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'

const navigation = [ { to: '/', label: 'Trang chủ', icon: House }, { to: '/study', label: 'Học từ vựng', icon: BookOpen }, { to: '/statistics', label: 'Thống kê', icon: BarChart3 } ]
export function AppLayout() {
  const { isDark, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0); document.title = `${navigation.find(item => item.to === pathname || (item.to !== '/' && pathname.startsWith(`${item.to}/`)))?.label ?? 'Không tìm thấy trang'} | English Flashcard` }, [pathname])
  return <>
    <a href="#main" className="skip-link">Đến nội dung chính</a>
    <header className="site-header"><div className="container header-inner">
      <NavLink to="/" className="brand" aria-label="English Flashcard — Trang chủ"><span className="brand-icon"><Layers3 size={23} /></span><span>English<span className="brand-light">Flashcard</span></span></NavLink>
      <nav aria-label="Điều hướng chính">{navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={17} /><span>{label}</span></NavLink>)}</nav>
      <button type="button" className="theme-button" onClick={toggleTheme} aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} aria-pressed={isDark}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button>
    </div></header>
    <main id="main" className="container" tabIndex={-1}><Outlet /></main>
    <footer className="container footer"><span><Layers3 size={17} /> English Flashcard</span><p>Học một chút mỗi ngày. Nhớ thêm thật nhiều.</p><span className="footer-note">Phiên bản giao diện demo <ArrowUpRight size={14} /></span></footer>
  </>
}
