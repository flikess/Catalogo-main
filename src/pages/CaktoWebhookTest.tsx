import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Send, AlertTriangle, CheckCircle, Copy, Mail } from 'lucide-react'
import { showSuccess, showError } from '@/utils/toast'

const CaktoWebhookTest = () => {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [formData, setFormData] = useState({
    customerName: 'Maria Silva',
    customerEmail: 'maria.silva@email.com',
    customerPhone: '(11) 99999-9999',
    paymentId: 'pay_' + Math.random().toString(36).substr(2, 9),
    amount: 9900, // R$ 99,00 em centavos
  })

  const webhookUrl = 'https://pfoaszhlqggxqsevkcat.supabase.co/functions/v1/cakto-webhook'
  const webhookSecret = 'a646b650-8839-471e-b36f-dc1288eb47b4'

  const generateTestPayload = () => {
    return {
      event: 'payment.confirmed',
      data: {
        payment: {
          id: formData.paymentId,
          status: 'confirmed',
          amount: formData.amount,
          currency: 'BRL'
        },
        customer: {
          name: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone,
          document: '123.456.789-00'
        },
        product: {
          name: 'Confeitaria Pro - Plano Mensal',
          description: 'Sistema completo de gestão para confeitarias'
        }
      }
    }
  }

  const testWebhook = async () => {
    setLoading(true)
    setResponse(null)

    try {
      const payload = generateTestPayload()
      
      console.log('🚀 Enviando webhook de teste:', payload)

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cakto-secret': webhookSecret
        },
        body: JSON.stringify(payload)
      })

      const responseData = await response.json()
      
      setResponse({
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        success: response.ok
      })

      if (response.ok) {
        showSuccess('Webhook processado com sucesso!')
      } else {
        showError('Erro no processamento do webhook')
      }

    } catch (error) {
      console.error('Erro ao testar webhook:', error)
      setResponse({
        status: 0,
        statusText: 'Network Error',
        data: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
        success: false
      })
      showError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess('Copiado para a área de transferência!')
    } catch (error) {
      showError('Erro ao copiar')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🧪 Teste do Webhook Cakto
          </h1>
          <p className="text-gray-600">
            Ferramenta para testar a integração completa com criação de usuário e envio de e-mail
          </p>
        </div>

        {/* Configurações do Webhook */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações do Webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="bg-gray-50" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Secret</Label>
                <div className="flex gap-2">
                  <Input value={webhookSecret} readOnly className="bg-gray-50" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(webhookSecret)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Teste */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Cliente para Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nome do Cliente</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">E-mail do Cliente</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Telefone</Label>
                <Input
                  id="customerPhone"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="amount">Valor (em centavos)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={testWebhook} disabled={loading} size="lg">
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Enviando...' : 'Testar Webhook Completo'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Funcionalidades */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">🚀 O que este teste faz:</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-blue-800 space-y-2">
              <li>✅ Valida o header x-cakto-secret</li>
              <li>✅ Cria usuário automaticamente no Supabase Auth</li>
              <li>✅ Gera senha aleatória segura</li>
              <li>✅ Marca e-mail como confirmado</li>
              <li>✅ Adiciona dados no user_metadata</li>
              <li>✅ Cria perfil e configurações iniciais</li>
              <li>📧 Envia e-mail de boas-vindas (se RESEND_API_KEY estiver configurada)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Payload de Teste */}
        <Card>
          <CardHeader>
            <CardTitle>Payload que será enviado</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(generateTestPayload(), null, 2)}
              readOnly
              rows={15}
              className="bg-gray-50 font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Resposta */}
        {response && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Resposta do Webhook
                {response.success ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Sucesso
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Erro
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status HTTP</Label>
                  <Input value={`${response.status} ${response.statusText}`} readOnly />
                </div>
                <div>
                  <Label>Sucesso</Label>
                  <Input value={response.success ? 'Sim' : 'Não'} readOnly />
                </div>
              </div>

              <div>
                <Label>Resposta JSON</Label>
                <Textarea
                  value={JSON.stringify(response.data, null, 2)}
                  readOnly
                  rows={10}
                  className="bg-gray-50 font-mono text-sm"
                />
              </div>

              {response.success && response.data.credentials && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2 flex items-center">
                    ✅ Usuário Criado com Sucesso:
                    {response.data.email_sent && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800">
                        <Mail className="w-3 h-3 mr-1" />
                        E-mail Enviado
                      </Badge>
                    )}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>E-mail:</strong> {response.data.credentials.email}</p>
                    <p><strong>Senha:</strong> {response.data.credentials.password}</p>
                    <p><strong>URL de Login:</strong> {response.data.credentials.login_url}</p>
                    <p><strong>ID do Usuário:</strong> {response.data.user.id}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Configuração do Resend */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">Configuração do E-mail</h3>
                <p className="text-sm text-amber-800 mt-1">
                  Para que o envio de e-mail funcione, configure a variável de ambiente 
                  <code className="bg-amber-200 px-1 rounded">RESEND_API_KEY</code> 
                  nas configurações da Edge Function no Supabase.
                </p>
                <p className="text-sm text-amber-800 mt-2">
                  <strong>Passos:</strong>
                </p>
                <ol className="text-sm text-amber-800 mt-1 ml-4">
                  <li>1. Crie uma conta no Resend.com</li>
                  <li>2. Gere uma API Key</li>
                  <li>3. Configure no Supabase: Edge Functions → Secrets</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CaktoWebhookTest