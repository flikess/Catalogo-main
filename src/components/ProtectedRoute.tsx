import { useAuth } from '@/components/auth/AuthProvider'
import { useSubscription } from '@/hooks/useSubscription'
import { Navigate } from 'react-router-dom'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth()
  const { subscriptionStatus } = useSubscription()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Verificar se é super admin - se for, pular verificação de assinatura
  const userRole = user.user_metadata?.role
  if (userRole === 'super_admin') {
    console.log('✅ Super admin detectado, pulando verificação de assinatura')
    return <>{children}</>
  }

  // Verificar se a assinatura está expirada há mais de 2 dias (apenas para usuários normais)
  if (subscriptionStatus.isExpired) {
    console.log('🚫 Acesso bloqueado: assinatura expirada')
    return <Navigate to="/pagamento" replace />
  }

  return <>{children}</>
}