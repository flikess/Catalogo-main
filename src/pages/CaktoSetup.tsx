import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Copy, ExternalLink, CheckCircle, Settings, Webhook } from 'lucide-react'
import { showSuccess, showError } from '@/utils/toast'

const CaktoSetup = () => {
  const webhookUrl = 'https://pfoaszhlqggxqsevkcat.supabase.co/functions/v1/cakto-webhook'
  const webhookSecret = 'a646b650-8839-471e-b36f-dc1288eb47b4'

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(`${type} copiado para a área de transferência!`)
    } catch (error) {
      showError('Erro ao copiar')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔗 Configuração do Webhook Cakto
          </h1>
          <p className="text-gray-600">
            Configure o webhook para criar usuários automaticamente após compras aprovadas
          </p>
        </div>

        {/* Instruções */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Como Configurar na Cakto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-blue-800 space-y-3">
              <li className="flex items-start gap-2">
                <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center">1</Badge>
                <span>Acesse o painel administrativo da Cakto</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center">2</Badge>
                <span>Vá para <strong>Configurações → Webhooks</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center">3</Badge>
                <span>Clique em <strong>"Adicionar Webhook"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center">4</Badge>
                <span>Configure com os dados abaixo</span>
              </li>
              <li className="flex items-start gap-2">
                <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center">5</Badge>
                <span>Selecione o evento <strong>"payment.confirmed"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Badge className="bg-blue-600 text-white min-w-[24px] h-6 flex items-center justify-center">6</Badge>
                <span>Salve e teste a configuração</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Dados para Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Dados para Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <Label className="text-base font-medium">URL do Webhook</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    value={webhookUrl} 
                    readOnly 
                    className="bg-gray-50 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(webhookUrl, 'URL')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Cole esta URL no campo "Endpoint URL" da Cakto
                </p>
              </div>

              <div>
                <Label className="text-base font-medium">Secret (Chave Secreta)</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    value={webhookSecret} 
                    readOnly 
                    className="bg-gray-50 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(webhookSecret, 'Secret')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Cole esta chave no campo "Secret" ou "Webhook Secret"
                </p>
              </div>

              <div>
                <Label className="text-base font-medium">Evento</Label>
                <div className="mt-2">
                  <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">
                    payment.confirmed
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Selecione apenas este evento para disparar o webhook
                </p>
              </div>

              <div>
                <Label className="text-base font-medium">Método HTTP</Label>
                <div className="mt-2">
                  <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
                    POST
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  O webhook deve usar o método POST
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* O que acontece */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              O que acontece após a configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-green-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>Cliente realiza compra na Cakto</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>Pagamento é aprovado (evento: payment.confirmed)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>Cakto dispara webhook para nosso sistema</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>Sistema cria usuário automaticamente no Supabase</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>Senha aleatória é gerada</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>E-mail é confirmado automaticamente</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>Perfil e configurações iniciais são criados</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>E-mail de boas-vindas é enviado com credenciais</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                <span>Cliente pode fazer login imediatamente</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teste */}
        <Card>
          <CardHeader>
            <CardTitle>Testar Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Após configurar o webhook na Cakto, você pode testar usando nossa ferramenta de teste:
            </p>
            <Button asChild>
              <a href="/cakto/webhook-test" className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Ir para Página de Teste
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Configuração do E-mail */}
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">📧 Configuração do E-mail (Opcional)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-800 mb-3">
              Para enviar e-mails de boas-vindas automaticamente, configure a variável de ambiente:
            </p>
            <div className="bg-amber-100 p-3 rounded font-mono text-sm">
              RESEND_API_KEY=re_xxxxxxxxxx
            </div>
            <p className="text-amber-800 mt-3 text-sm">
              Configure esta variável no Supabase: Edge Functions → Secrets
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CaktoSetup