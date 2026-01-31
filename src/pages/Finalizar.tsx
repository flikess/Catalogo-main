import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowLeft, ImageIcon, Phone, Mail, MapPin } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Additional {
  name: string
  price: number
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  selectedAdditionais: Additional[]
}

const FinalizarPedido = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { cart = [], cartTotal = 0, bakerySettings = {} } = location.state || {}

  const [form, setForm] = useState({
    nome: '',
    celular: '',
    endereco: '',
    dataEntrega: '',
    horaRetirada: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

  const getFullAddress = () => {
    const {
      address_street,
      address_number,
      address_neighborhood,
      address_city,
      address_state
    } = bakerySettings
    return [address_street, address_number, address_neighborhood, address_city, address_state]
      .filter(Boolean)
      .join(', ')
  }

  const generateWhatsAppMessage = () => {
    const itemsText = cart
      .map(item => {
        let itemText = `• ${item.name} - ${item.quantity}x ${formatPrice(item.price)}`
        
        if (item.selectedAdditionais?.length > 0) {
          itemText += `\n   ➕ Adicionais: ${item.selectedAdditionais
            .map(add => `${add.name} (+${formatPrice(add.price)})`)
            .join(', ')}`
        }
        
        return itemText
      })
      .join('%0A')

    return `Olá, *${bakerySettings.bakery_name || 'Confeitaria'}*!%0A%0A` +
      `Estou finalizando um pedido com os seguintes itens:%0A` +
      `*Itens selecionados:*%0A${itemsText}%0A%0A` +
      `💰 *Total estimado:* ${formatPrice(cartTotal)}%0A%0A` +
      `*Informações do cliente:*%0A` +
      `📍 Nome: ${form.nome}%0A` +
      `📞 Telefone: ${form.celular}%0A` +
      `🏠 Endereço: ${form.endereco}%0A` +
      `📅 Entrega: ${form.dataEntrega}%0A` +
      `⏰ Retirada: ${form.horaRetirada}%0A%0A` +
      `Aguardo a confirmação para dar continuidade. Obrigado!`
  }

  const handleSubmit = async () => {
    const camposObrigatorios = ['nome', 'celular', 'endereco', 'dataEntrega', 'horaRetirada']
    const camposVazios = camposObrigatorios.filter(campo => !form[campo as keyof typeof form])
    if (camposVazios.length > 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    const userId = bakerySettings?.id
    if (!userId) {
      toast.error('Erro ao identificar a confeitaria.')
      return
    }

    try {
      // Verifica cliente existente
      let clienteId: string | null = null
      const { data: clienteExistente } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .eq('name', form.nome)
        .eq('phone', form.celular)
        .maybeSingle()

      if (clienteExistente) {
        clienteId = clienteExistente.id
      } else {
        const { data: novoCliente, error: erroCliente } = await supabase
          .from('clients')
          .insert({
            user_id: userId,
            name: form.nome,
            phone: form.celular,
            address: form.endereco,
            city: bakerySettings?.address_city || ''
          })
          .select()
          .single()

        if (erroCliente) throw erroCliente
        clienteId = novoCliente.id
      }

      // Cria pedido
      const { data: pedido, error: erroPedido } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          client_id: clienteId,
          client_name: form.nome,
          total_amount: cartTotal,
          delivery_date: form.dataEntrega,
          notes: `Endereço: ${form.endereco} | Retirada: ${form.horaRetirada}`,
          status: 'orcamento'
        })
        .select()
        .single()

      if (erroPedido) throw erroPedido

      // Cria itens do pedido com adicionais
      const itens = cart.map(item => ({
        order_id: pedido.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        adicionais: item.selectedAdditionais
      }))

      const { error: erroItens } = await supabase.from('order_items').insert(itens)
      if (erroItens) throw erroItens

      // Abrir WhatsApp
      const telefoneConfeitaria = bakerySettings.phone?.replace(/\D/g, '')
      const link = telefoneConfeitaria
        ? `https://wa.me/55${telefoneConfeitaria}?text=${generateWhatsAppMessage()}`
        : `https://wa.me/?text=${generateWhatsAppMessage()}`

      toast.success('Pedido enviado com sucesso! Redirecionando...', {
        description: 'Você será redirecionado para o catálogo.',
        duration: 3000
      })

      setTimeout(() => {
        window.open(link, '_blank')
        navigate(`/catalogo/${userId}`)
      }, 1500)

    } catch (error) {
      console.error(error)
      toast.error('Erro ao processar pedido. Por favor, tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Header da confeitaria */}
      <div className="max-w-6xl mx-auto px-4 mb-10 text-center">
        {bakerySettings.logo_url && (
          <img
            src={bakerySettings.logo_url}
            alt="Logo"
            className="w-32 h-32 object-cover rounded-full mx-auto mb-4 shadow-md"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <h1 className="text-3xl font-bold">{bakerySettings.bakery_name || 'Confeitaria'}</h1>
        <div className="mt-2 flex justify-center gap-6 flex-wrap text-gray-600 text-sm">
          {bakerySettings.phone && (
            <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{bakerySettings.phone}</span>
          )}
          {bakerySettings.email && (
            <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{bakerySettings.email}</span>
          )}
          {getFullAddress() && (
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{getFullAddress()}</span>
          )}
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Formulário */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Seus Dados</h2>
          <div className="space-y-4">
            <Input name="nome" placeholder="Seu nome completo" value={form.nome} onChange={handleChange} required />
            <Input name="celular" placeholder="WhatsApp com DDD" value={form.celular} onChange={handleChange} required />
            <Input name="endereco" placeholder="Endereço completo" value={form.endereco} onChange={handleChange} required />
            <Input name="dataEntrega" type="date" placeholder="Data de entrega" value={form.dataEntrega} onChange={handleChange} required />
            <Input name="horaRetirada" type="time" placeholder="Hora de retirada" value={form.horaRetirada} onChange={handleChange} required />
          </div>

          <Button onClick={handleSubmit} className="w-full mt-6 bg-green-600 hover:bg-green-700">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar Pedido via WhatsApp
          </Button>

          <Button variant="outline" className="w-full mt-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Catálogo
          </Button>
        </div>

        {/* Resumo do pedido */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Resumo do Pedido</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500">Nenhum item no carrinho.</p>
          ) : (
            <ul className="divide-y">
              {cart.map((item: CartItem) => (
                <li key={item.id} className="py-3">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.quantity}x {formatPrice(item.price)}</p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                  
                  {/* Adicionais do item */}
                  {item.selectedAdditionais?.length > 0 && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Adicionais:</p>
                      <ul className="space-y-1">
                        {item.selectedAdditionais.map((add, index) => (
                          <li key={index} className="flex justify-between text-sm">
                            <span>+ {add.name}</span>
                            <span>+ {formatPrice(add.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 border-t pt-4 flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinalizarPedido
