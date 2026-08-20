import { Navigate, Route, Routes } from 'react-router-dom'
import { ScorePage } from './pages/Score/ScorePage'
import { AdminPage } from './pages/Admin/AdminPage'
import { ResultsPage } from './pages/Results/ResultsPage'
import './styles/tokens.css'
import './styles/global.css'
import './styles/components.css'

export default function App() { return <Routes><Route path="/score" element={<ScorePage />} /><Route path="/admin" element={<AdminPage />} /><Route path="/results" element={<ResultsPage />} /><Route path="*" element={<Navigate to="/score" replace />} /></Routes> }
