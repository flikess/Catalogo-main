import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowLeft, Phone, Mail, MapPin } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Additional {
  name: string
  price: number
}

interface SizeOption {
  name: string
  price: number
}



interface CartItem {
  id: string
  name: string
  price: number
  quantity: number

  size?: SizeOption | string | null
  selectedSize?: SizeOption | null

  selectedAdditionais: Additional[]

  selectedVariations?: {
    group: string
    name: string
    price: number
  }[]
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
    const { address_street, address_number, address_neighborhood, address_city, address_state } = bakerySettings
    return [address_street, address_number, address_neighborhood, address_city, address_state].filter(Boolean).join(', ')
  }

  // --- HELPERS PARA TAMANHO E PREÇO ---
  const getSizeName = (item: CartItem) => {
    if (!item.size && !item.selectedSize) return null
    if (item.selectedSize) return item.selectedSize.name
    return typeof item.size === 'string' ? item.size : item.size.name
  }

const getUnitPrice = (item: CartItem) => {
  const sizePrice =
    item.selectedSize?.price ??
    (typeof item.size === 'object' ? item.size?.price : undefined)

  // se o tamanho não tiver preço ou for 0 → usa o preço base
  if (!sizePrice || sizePrice <= 0) {
    return item.price
  }

  return sizePrice
}


const getTotalPrice = (item: CartItem) => {
  return getItemUnitWithAdditionals(item) * item.quantity
}

  const getAdditionalsTotal = (item: CartItem) => {
  return item.selectedAdditionais?.reduce((sum, a) => sum + a.price, 0) || 0
}

const getVariationsTotal = (item: CartItem) => {
  return item.selectedVariations?.reduce(
    (sum, v) => sum + (v.price || 0),
    0
  ) || 0
}

const getItemUnitWithAdditionals = (item: CartItem) => {
  return (
    getUnitPrice(item) +
    getAdditionalsTotal(item) +
    getVariationsTotal(item)
  )
}


      const finalTotal = cart.reduce((sum, item) => {
  return sum + getTotalPrice(item)
}, 0)

  // --- GERA MENSAGEM WHATSAPP ---
 const generateWhatsAppMessage = () => {
  const itemsText = cart
    .map(item => {
      const lines: string[] = []

      lines.push(`• ${item.name}`)

      const size = getSizeName(item)
      if (size) {
        lines.push(`   Tamanho: ${size}`)
      }

      if (item.selectedAdditionais?.length > 0) {
        lines.push(`   Adicionais:`)
        item.selectedAdditionais.forEach(a => {
          lines.push(`     - ${a.name} (+${formatPrice(a.price)})`)
        })
      }
      if (item.selectedVariations?.length > 0) {
  lines.push(`   Variações:`)

  item.selectedVariations.forEach(v => {
    lines.push(`     - ${v.group}: ${v.name}`)
  })
}



      lines.push(`   Quantidade: ${item.quantity}`)
      lines.push(`   Unitário: ${formatPrice(getItemUnitWithAdditionals(item))}`)
      lines.push(`   Subtotal: ${formatPrice(getTotalPrice(item))}`)

      return lines.join('%0A')
    })
    .join('%0A%0A')

  return (
    `Olá, *${bakerySettings.bakery_name || 'Loja'}*!%0A%0A` +
    `📋 *Resumo do pedido*%0A%0A` +
    `${itemsText}%0A%0A` +
    `💰 *Total do pedido:* ${formatPrice(finalTotal)}%0A%0A` +
    `👤 *Dados do cliente*%0A` +
    `Nome: ${form.nome}%0A` +
    `Telefone: ${form.celular}%0A` +
    `Endereço: ${form.endereco}%0A` +
    `Data de entrega: ${form.dataEntrega}%0A` +
    `Hora: ${form.horaRetirada}`
  )
}


  // --- SUBMIT PEDIDO ---
  const handleSubmit = async () => {
    const camposObrigatorios = ['nome', 'celular', 'endereco', 'dataEntrega', 'horaRetirada']
    const camposVazios = camposObrigatorios.filter(campo => !form[campo as keyof typeof form])
    if (camposVazios.length > 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    const userId = bakerySettings?.id
    if (!userId) {
      toast.error('Erro ao identificar a Loja.')
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
          total_amount: finalTotal,
          delivery_date: form.dataEntrega,
          notes: `Endereço: ${form.endereco} | Retirada: ${form.horaRetirada}`,
          status: 'orcamento'
        })
        .select()
        .single()
      if (erroPedido) throw erroPedido

      // Cria itens do pedido
const itens = cart.map(item => ({
  order_id: pedido.id,
  product_id: item.id,
  product_name: item.name,
  quantity: item.quantity,
  unit_price: getItemUnitWithAdditionals(item),
total_price: getTotalPrice(item),


  adicionais: item.selectedAdditionais,

  variations: item.selectedVariations, // 👈 NOVO

  size: getSizeName(item)
}))




      const { error: erroItens } = await supabase.from('order_items').insert(itens)
      if (erroItens) throw erroItens

      // Abrir WhatsApp
      const telefoneLoja = bakerySettings.phone?.replace(/\D/g, '')
      const link = telefoneLoja
        ? `https://wa.me/55${telefoneLoja}?text=${generateWhatsAppMessage()}`
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
      {/* Header da Loja */}
      <div className="max-w-6xl mx-auto px-4 mb-10 text-center">
        {bakerySettings.logo_url && (
          <img
            src={bakerySettings.logo_url}
            alt="Logo"
            className="w-32 h-32 object-cover rounded-full mx-auto mb-4 shadow-md"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        )}
        <h1 className="text-3xl font-bold">{bakerySettings.bakery_name || 'Loja'}</h1>
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
              {cart.map(item => {
                const tamanhoLabel = getSizeName(item) ? ` | Tamanho: ${getSizeName(item)}` : ''
                return (
                  <li key={item.id} className="py-3">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">{item.name}{tamanhoLabel}</p>

                        {item.selectedAdditionais?.length > 0 && (
                          <p className="text-xs text-gray-500">
                            Adicionais: {item.selectedAdditionais.map(a => a.name).join(', ')}
                          </p>
                        )}


{item.selectedVariations?.length > 0 && (
  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
    {item.selectedVariations.map((v, index) => (
      <p key={index}>
        {v.group}: {v.name}
      </p>
    ))}
  </div>
)}



                        <p className="text-sm text-gray-500">
  {item.quantity}x {formatPrice(getItemUnitWithAdditionals(item))}
</p>

{getSizeName(item) && (
  <p className="text-xs text-gray-500">
    Tamanho: {getSizeName(item)}
  </p>
)}

{item.selectedAdditionais?.length > 0 && (
  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
    {item.selectedAdditionais.map((a, index) => (
      <p key={index}>
        + {a.name} ({formatPrice(a.price)})
      </p>
    ))}
  </div>
)}

<p className="text-xs text-gray-600 mt-1">
  Subtotal: {formatPrice(getTotalPrice(item))}
</p>

                      </div>
                      <p className="font-semibold">{formatPrice(getTotalPrice(item))}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="mt-6 border-t pt-4 flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span>{formatPrice(finalTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FinalizarPedido
