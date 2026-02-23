import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, CreditCard, Calendar, CheckCircle, LogOut } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess } from '@/utils/toast'

const Pagamento = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    plano: '',
    vencimento: '',
    data_pagamento: '',
    daysExpired: 0
  })

  useEffect(() => {
    if (user?.user_metadata) {
      loadSubscriptionInfo()
    }
  }, [user])

  const loadSubscriptionInfo = () => {
    const metadata = user?.user_metadata
    if (metadata?.vencimento) {
      const vencimento = new Date(metadata.vencimento)
      const hoje = new Date()
      const diffTime = hoje.getTime() - vencimento.getTime()
      const daysExpired = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      setSubscriptionInfo({
        plano: metadata.plano || '',
        vencimento: metadata.vencimento || '',
        data_pagamento: metadata.data_pagamento || '',
        daysExpired
      })
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const handleRenewPlan = (planType: 'mensal' | 'anual') => {
    // URLs do checkout da Cakto - substitua pelas URLs reais
    const checkoutUrls = {
      mensal: 'https://pay.cakto.com.br/fk98ct3',
      anual: 'https://pay.cakto.com.br/xc5mxv4'
    }

    window.open(checkoutUrls[planType], '_blank')
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      showSuccess('Logout realizado com sucesso!')
      navigate('/login')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            🚫 Assinatura Expirada
          </h1>
          <p className="text-gray-600">
            Sua assinatura está vencida. Renove agora para continuar usando o Cataloguei.
          </p>
        </div>

        {/* Informações da Assinatura Atual */}
        {subscriptionInfo.plano && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Sua Assinatura Anterior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-red-600 font-medium">Plano:</span>
                  <div className="font-semibold">{subscriptionInfo.plano}</div>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Venceu em:</span>
                  <div className="font-semibold">{formatDate(subscriptionInfo.vencimento)}</div>
                </div>
                <div>
                  <span className="text-red-600 font-medium">Status:</span>
                  <div>
                    <Badge className="bg-red-100 text-red-800">
                      Expirada há {subscriptionInfo.daysExpired} dias
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Planos de Renovação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Mensal */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Plano Mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">R$ 29,99</div>
                <div className="text-sm text-gray-500">por mês</div>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Gestão completa de pedidos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Controle de estoque
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Relatórios financeiros
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Catálogos online
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Suporte técnico
                </li>
              </ul>

              <Button
                onClick={() => handleRenewPlan('mensal')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Renovar Mensal
              </Button>
            </CardContent>
          </Card>

          {/* Plano Anual */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-green-200 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-green-600 text-white px-3 py-1">
                💰 Mais Popular
              </Badge>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-green-600" />
                Plano Anual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">R$ 149,99</div>
                <div className="text-sm text-gray-500">por ano</div>
                <div className="text-xs text-green-600 font-medium">
                  Economize R$ 199 em relação ao plano mensal.
                </div>
              </div>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Todos os recursos do mensal
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <strong>59% de desconto</strong>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Suporte prioritário
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Recursos exclusivos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Sem preocupação por 1 ano
                </li>
              </ul>

              <Button
                onClick={() => handleRenewPlan('anual')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Renovar Anual
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-medium text-blue-900">
                ✨ Após a renovação
              </h3>
              <p className="text-sm text-blue-800">
                Seu acesso será restaurado automaticamente e você poderá continuar
                gerenciando sua Loja sem interrupções.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botão Sair do Sistema */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>Cataloguei - Sistema de Gestão Completo</p>
          <p>Dúvidas? Entre em contato conosco</p>
        </div>
      </div>
    </div>
  )
}

export default Pagamento
