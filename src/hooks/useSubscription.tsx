import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { showError } from '@/utils/toast'

interface SubscriptionStatus {
  isActive: boolean
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiration: number
  plano: string
  vencimento: string
  data_pagamento: string
}

export const useSubscription = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isActive: false,
    isExpired: false,
    isExpiringSoon: false,
    daysUntilExpiration: 0,
    plano: '',
    vencimento: '',
    data_pagamento: ''
  })

  useEffect(() => {
    if (user?.user_metadata) {
      checkSubscriptionStatus()

      // Verifica o status periodicamente (a cada 1 minuto) para garantir que
      // se o tempo passar enquanto o usuário estiver online, ele seja redirecionado.
      const interval = setInterval(() => {
        checkSubscriptionStatus()
      }, 60000)

      return () => clearInterval(interval)
    }
  }, [user])

  const checkSubscriptionStatus = () => {
    const metadata = user?.user_metadata

    // Se for super admin, sempre ativo
    if (metadata?.role === 'super_admin') {
      setSubscriptionStatus({
        isActive: true,
        isExpired: false,
        isExpiringSoon: false,
        daysUntilExpiration: 999,
        plano: 'Super Admin',
        vencimento: '',
        data_pagamento: ''
      })
      return
    }

    if (!metadata?.vencimento) {
      // Usuário sem assinatura
      setSubscriptionStatus({
        isActive: false,
        isExpired: true,
        isExpiringSoon: false,
        daysUntilExpiration: 0,
        plano: '',
        vencimento: '',
        data_pagamento: ''
      })
      return
    }

    const vencimento = new Date(metadata.vencimento)
    const hoje = new Date()
    const diffTime = vencimento.getTime() - hoje.getTime()
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const isTrial = metadata.plano?.toLowerCase() === 'trial' || metadata.plano?.toLowerCase() === 'teste grátis'

    // Para trial expira no exato minuto. Para assinaturas normais, dá 2 dias de carência.
    const isExpired = isTrial ? diffTime < 0 : daysUntilExpiration < -2

    const isExpiringSoon = daysUntilExpiration <= 2 && daysUntilExpiration >= 0 // Vence em 2 dias ou menos
    const isActive = !isExpired // Ativo se não está expirado

    console.log('🔔 Verificação de assinatura:', {
      vencimento: vencimento.toLocaleDateString('pt-BR'),
      daysUntilExpiration,
      isExpired,
      isExpiringSoon,
      isActive
    })

    setSubscriptionStatus({
      isActive,
      isExpired,
      isExpiringSoon,
      daysUntilExpiration,
      plano: metadata.plano || '',
      vencimento: metadata.vencimento || '',
      data_pagamento: metadata.data_pagamento || ''
    })

    // Redirecionar para página de pagamento se expirado (apenas usuários normais)
    if (isExpired && metadata?.role !== 'super_admin') {
      console.log('🚫 Assinatura expirada, redirecionando para pagamento')
      navigate('/pagamento')
    }
  }

  const formatDaysMessage = (days: number): string => {
    if (days === 0) return 'hoje'
    if (days === 1) return 'amanhã'
    if (days === 2) return 'em 2 dias'
    return `em ${days} dias`
  }

  return {
    subscriptionStatus,
    formatDaysMessage,
    checkSubscriptionStatus
  }
}