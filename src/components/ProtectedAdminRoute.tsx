import { useAuth } from '@/components/auth/AuthProvider'
import { Navigate } from 'react-router-dom'

interface ProtectedAdminRouteProps {
  children: React.ReactNode
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Verificando permissões...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Verificar se o usuário tem role de super_admin
  const userRole = user.user_metadata?.role
  if (userRole !== 'super_admin') {
    console.log('🚫 Acesso negado: usuário não é super_admin', { userRole, email: user.email })
    return <Navigate to="/dashboard" replace />
  }

  console.log('✅ Acesso liberado para super_admin:', user.email)
  return <>{children}</>
}