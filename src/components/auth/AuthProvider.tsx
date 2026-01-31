import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasShownWelcomeToast, setHasShownWelcomeToast] = useState(false)

  useEffect(() => {
    console.log('AuthProvider: Initializing...')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('AuthProvider: Initial session check:', { session, error })
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', { event, session })
        setUser(session?.user ?? null)
        
        // Mostrar toast de boas-vindas apenas quando usuário faz login (não em mudanças de estado)
        if (event === 'SIGNED_IN' && session?.user && !hasShownWelcomeToast) {
          checkSubscriptionOnLogin(session.user)
          setHasShownWelcomeToast(true)
        }
        
        // Reset flag quando usuário faz logout
        if (event === 'SIGNED_OUT') {
          setHasShownWelcomeToast(false)
        }
        
        setLoading(false)
      }
    )

    return () => {
      console.log('AuthProvider: Cleaning up subscription')
      subscription.unsubscribe()
    }
  }, [hasShownWelcomeToast])

  const checkSubscriptionOnLogin = (user: User) => {
    const metadata = user.user_metadata
    if (!metadata?.vencimento) {
      console.log('⚠️ Usuário sem dados de assinatura')
      return
    }

    const vencimento = new Date(metadata.vencimento)
    const hoje = new Date()
    const diffTime = vencimento.getTime() - hoje.getTime()
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    console.log('🔔 Verificação de assinatura no login:', {
      vencimento: vencimento.toLocaleDateString('pt-BR'),
      daysUntilExpiration,
      plano: metadata.plano
    })

    // Mostrar toast de boas-vindas com status da assinatura
    if (daysUntilExpiration >= 0) {
      if (daysUntilExpiration <= 2) {
        showError(`⚠️ Sua assinatura ${metadata.plano} vence em ${daysUntilExpiration === 0 ? 'hoje' : daysUntilExpiration === 1 ? 'amanhã' : '2 dias'}!`)
      } else {
        showSuccess(`✅ Bem-vindo! Sua assinatura ${metadata.plano} está ativa até ${vencimento.toLocaleDateString('pt-BR')}`)
      }
    }
  }

  console.log('AuthProvider: Current state:', { user: user?.email, loading })

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}