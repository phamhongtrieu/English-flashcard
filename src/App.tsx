import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { StudyPage } from './pages/StudyPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProgressProvider } from './components/layout/ProgressProvider'

export default function App() {
  return <ProgressProvider><BrowserRouter><Routes><Route element={<AppLayout />}><Route index element={<HomePage />} /><Route path="study" element={<StudyPage />} /><Route path="study/:unitId" element={<StudyPage />} /><Route path="statistics" element={<StatisticsPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes></BrowserRouter></ProgressProvider>
}
