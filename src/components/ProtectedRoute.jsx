import { Navigate } from 'react-router-dom'
import { useAuth, roleHomePath } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRole }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (profile?.role !== allowedRole) {
    return <Navigate to={roleHomePath(profile?.role)} replace />
  }

  return children
}
