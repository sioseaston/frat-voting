import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AdminDashboard } from './pages/AdminDashboard'
import { MemberDashboard } from './pages/MemberDashboard'
import { ElectionsPage } from './pages/ElectionsPage'
import { PositionsPage } from './pages/PositionsPage'
import { CandidatesPage } from './pages/CandidatesPage'
import { AuditLogsPage } from './pages/AuditLogsPage'
import { MembersPage } from './pages/MembersPage'
import { VotePage } from './pages/VotePage'
import { ResultsPage } from './pages/ResultsPage'
import { SuccessPage } from './pages/SuccessPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'admin' ? '/admin' : '/member'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="elections" element={<ElectionsPage />} />
            <Route path="positions" element={<PositionsPage />} />
            <Route path="candidates" element={<CandidatesPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route path="/member" element={<ProtectedRoute roles={['member']} />}>
            <Route index element={<MemberDashboard />} />
            <Route path="vote" element={<VotePage />} />
            <Route path="vote/success" element={<SuccessPage />} />
          </Route>
          <Route path="/results" element={<ResultsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}
