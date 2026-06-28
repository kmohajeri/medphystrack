import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, roleHomePath } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SuperAdminDashboard from './pages/dashboards/SuperAdminDashboard'
import ProgramAdminDashboard from './pages/dashboards/ProgramAdminDashboard'
import ResidentDashboard from './pages/dashboards/ResidentDashboard'
import OrganizationsPage from './pages/superadmin/OrganizationsPage'
import ProgramsPage from './pages/superadmin/ProgramsPage'
import CurriculumPage from './pages/programadmin/CurriculumPage'
import ResidentsPage from './pages/programadmin/ResidentsPage'
import ApplicationsPage from './pages/programadmin/ApplicationsPage'
import ResidentProgressPage from './pages/programadmin/ResidentProgressPage'
import MyCurriculumPage from './pages/resident/MyCurriculumPage'
import ResidentEvaluationsPage from './pages/resident/EvaluationsPage'
import HandbookPage from './pages/resident/HandbookPage'

function RootRedirect() {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // Profile may still be fetching briefly after login
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return <Navigate to={roleHomePath(profile.role)} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allowedRole="super_admin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/organizations"
            element={
              <ProtectedRoute allowedRole="super_admin">
                <OrganizationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/programs"
            element={
              <ProtectedRoute allowedRole="super_admin">
                <ProgramsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/program-admin"
            element={
              <ProtectedRoute allowedRole="program_admin">
                <ProgramAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/program-admin/curriculum"
            element={
              <ProtectedRoute allowedRole="program_admin">
                <CurriculumPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/program-admin/residents"
            element={
              <ProtectedRoute allowedRole="program_admin">
                <ResidentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/program-admin/residents/:residentId"
            element={
              <ProtectedRoute allowedRole="program_admin">
                <ResidentProgressPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/program-admin/applications"
            element={
              <ProtectedRoute allowedRole="program_admin">
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resident"
            element={
              <ProtectedRoute allowedRole="resident">
                <ResidentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resident/curriculum"
            element={
              <ProtectedRoute allowedRole="resident">
                <MyCurriculumPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resident/evaluations"
            element={
              <ProtectedRoute allowedRole="resident">
                <ResidentEvaluationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resident/handbook"
            element={
              <ProtectedRoute allowedRole="resident">
                <HandbookPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
