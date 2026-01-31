import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Mail, Lock, ArrowRight, Copy, Eye, EyeOff } from 'lucide-react'
import { showSuccess, showError } from '@/utils/toast'

const CaktoSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
    name: ''
  })

  useEffect(() => {
    // Extrair dados da URL (se fornecidos)
    const email = searchParams.get('email') || ''
    const password = searchParams.get('password') || ''
    const name = searchParams.get('name') || ''

    setCredentials({ email, password, name })
  }, [searchParams])

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(`${type} copiado para a área de transferência!`)
    } catch (error) {
      showError('Erro ao copiar')
    }
  }

  const handleLogin = () => {
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header de Sucesso */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🎉 Compra Aprovada!
          </h1>
          <p className="text-gray-600">
            Sua conta na Confeitaria Pro foi criada automaticamente
          </p>
        </div>

        {/* Card com Credenciais */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-lg">
              Seus Dados de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {credentials.name && (
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Bem-vindo(a),</p>
                <p className="font-semibold text-blue-900">{credentials.name}</p>
              </div>
            )}

            {/* E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                E-mail
              </Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  value={credentials.email}
                  readOnly
                  className="bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(credentials.email, 'E-mail')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Senha */}
            {credentials.password && (
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha Temporária
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={credentials.password}
                      readOnly
                      className="bg-gray-50 pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(credentials.password, 'Senha')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  ⚠️ Recomendamos alterar sua senha após o primeiro login
                </p>
              </div>
            )}

            {/* Instruções */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                Próximos Passos:
              </h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Clique no botão "Fazer Login" abaixo</li>
                <li>2. Use o e-mail e senha fornecidos</li>
                <li>3. Altere sua senha nas configurações</li>
                <li>4. Configure sua confeitaria</li>
                <li>5. Comece a gerenciar seus pedidos!</li>
              </ol>
            </div>

            {/* Botão de Login */}
            <Button onClick={handleLogin} className="w-full" size="lg">
              <ArrowRight className="w-4 h-4 mr-2" />
              Fazer Login Agora
            </Button>

            {/* Informações Adicionais */}
            <div className="text-center text-xs text-gray-500 space-y-1">
              <p>Seu e-mail já foi confirmado automaticamente</p>
              <p>Em caso de dúvidas, entre em contato conosco</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Confeitaria Pro - Sistema de Gestão Completo
          </p>
        </div>
      </div>
    </div>
  )
}

export default CaktoSuccess