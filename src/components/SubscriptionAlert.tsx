import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X, Crown } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { useAuth } from '@/components/auth/AuthProvider'

export const SubscriptionAlert = () => {
  const { user } = useAuth()
  const { subscriptionStatus, formatDaysMessage } = useSubscription()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Não mostrar alerta para super admins
    if (user?.user_metadata?.role === 'super_admin') {
      setIsVisible(false)
      return
    }

    if (subscriptionStatus.isExpiringSoon) {
      setIsVisible(true)
    }
  }, [subscriptionStatus.isExpiringSoon, user])

  // Não renderizar para super admins
  if (user?.user_metadata?.role === 'super_admin') {
    return null
  }

  if (!isVisible || !subscriptionStatus.isExpiringSoon) {
    return null
  }

  const handleRenew = () => {
    // Redirecionar para checkout da Cakto
    const checkoutUrl = subscriptionStatus.plano === 'Anual' 
      ? 'https://pay.cakto.com.br/confeitaria-pro-anual' // Substitua pela URL real
      : 'https://pay.cakto.com.br/confeitaria-pro-mensal' // Substitua pela URL real
    
    window.open(checkoutUrl, '_blank')
  }

  const handleDismiss = () => {
    setIsVisible(false)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className="max-w-4xl mx-auto bg-yellow-50 border-yellow-200 shadow-lg">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-yellow-800">
              ⚠️ Sua assinatura {subscriptionStatus.plano} vence {formatDaysMessage(subscriptionStatus.daysUntilExpiration)}. 
              Renove para não perder acesso!
            </span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button 
              size="sm" 
              onClick={handleRenew}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Renovar Agora
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismiss}
              className="text-yellow-600 hover:text-yellow-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}