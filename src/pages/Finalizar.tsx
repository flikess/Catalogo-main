import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageCircle, ArrowLeft, Phone, Mail, MapPin, Truck, Store, CreditCard, Banknote, QrCode, Link as LinkIcon, Copy, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
    querEntrega: true,
    metodoPagamento: (bakerySettings?.payment_enabled) ? 'pix' : 'dinheiro'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pixModalOpen, setPixModalOpen] = useState(false)
  const [pixData, setPixData] = useState<{ qr_code?: string, qr_code_base64?: string, ticket_url?: string, payment_id?: string, init_point?: string, type?: string, external_reference?: string } | null>(null)
  const [isPolling, setIsPolling] = useState(false);

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

        return lines.join('\n')
      })
      .join('\n\n')

    return (
      `Olá, *${bakerySettings.bakery_name || 'Loja'}*! \n\n` +
      `\u{1F4CB} *Resumo do pedido*\n\n` +
      `${itemsText}\n\n` +
      `\u{1F4B0} *Total do pedido:* ${formatPrice(finalTotal)}\n\n` +
      `\u{1F464} *Dados do cliente*\n` +
      `Nome: ${form.nome}\n` +
      `Telefone: ${form.celular}\n` +
      `Tipo: ${form.querEntrega ? 'Entrega' : 'Retirada na Loja'}\n` +
      (form.querEntrega ? `Endereço: ${form.endereco}\n` : '') +
      `Data: ${form.dataEntrega}\n` +
      `Pagamento: ${form.metodoPagamento.toUpperCase()}`
    )
  }


  const createOrderInDatabase = async (status: string, paymentMethod: string, userId: string) => {
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
        payment_method: paymentMethod,
        notes: `Tipo: ${form.querEntrega ? 'Entrega' : 'Retirada'} | Pagamento: ${paymentMethod} | ${form.querEntrega ? 'Endereço: ' + form.endereco : ''}`,
        status: status
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
      variations: item.selectedVariations,
      size: getSizeName(item)
    }))

    const { error: erroItens } = await supabase.from('order_items').insert(itens)
    if (erroItens) throw erroItens

    return pedido;
  }

  // --- SUBMIT PEDIDO ---
  const handleSubmit = async () => {
    if (isSubmitting) return;

    const camposObrigatorios = ['nome', 'celular', 'dataEntrega']
    if (form.querEntrega) {
      camposObrigatorios.push('endereco')
    }

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

    setIsSubmitting(true)
    try {

      // LÓGICA DE PAGAMENTO ONLINE (MERCADO PAGO) Se a loja ativou e o método é Pix/Cartão
      if (bakerySettings?.payment_enabled && ['pix', 'cartao', 'link'].includes(form.metodoPagamento)) {

        // AGORA NÓS SALVAMOS O PEDIDO DE FATO NO BANCO PRIMEIRO COMO ORCAMENTO
        const pedido = await createOrderInDatabase('orcamento', form.metodoPagamento, userId);

        const { data: payData, error: payError } = await supabase.functions.invoke('create-mp-preference', {
          body: {
            bakery_id: userId,
            order_id: pedido.id,
            cart_items: cart,
            total_amount: finalTotal,
            client_data: { nome: form.nome, telefone: form.celular },
            payment_method: form.metodoPagamento
          }
        })

        if (payError || !payData?.success) {
          await supabase.from('orders').delete().eq('id', pedido.id); // Reverte caso a API falhe
          throw new Error(payData?.error || 'Erro ao gerar link de pagamento')
        }

        if (payData.type === 'pix') {
          setPixData({ ...payData, external_reference: pedido.id })
          setPixModalOpen(true)
          toast.success('Realize o pagamento para confirmar o pedido.', { duration: 3000 })
        } else {
          // Cartão de Crédito
          setPixData({ ...payData, external_reference: pedido.id, type: 'cartao' })
          setPixModalOpen(true)
          window.open(payData.init_point, '_blank')
          toast.success('Conclua o pagamento na nova aba para confirmar o pedido.', { duration: 3000 })
        }

        // --- POLLING LOOP (Checa o banco a cada 5s) ---
        setIsPolling(true);
        let tentativas = 0;
        const pollInterval = setInterval(async () => {
          tentativas++;
          if (tentativas > 60) { // 5 minutos timeout
            clearInterval(pollInterval);
            setIsPolling(false);
            setPixModalOpen(false);
            await supabase.from('orders').delete().eq('id', pedido.id);
            toast.error('O tempo de pagamento expirou. Pedido cancelado.', { duration: 5000 });
            setIsSubmitting(false);
            return;
          }

          const { data: statusData } = await supabase.functions.invoke('check-mp-payment', {
            body: { bakery_id: userId, external_reference: pedido.id }
          });

          if (statusData?.approved) {
            clearInterval(pollInterval);
            setIsPolling(false);
            setPixModalOpen(false);
            toast.success('Pagamento confirmado! Abrindo comprovante...', { duration: 3000 });

            // O PAGAMENTO APROVOU, MUDAMOS O STATUS E EXIBIMOS WHATSAPP COM CONFIRMAÇÃO
            await supabase.from('orders').update({ status: 'confirmado' }).eq('id', pedido.id);

            const message = generateWhatsAppMessage() + '\n\n✅ *PAGAMENTO ONLINE CONFIRMADO VIA SISTEMA!*';
            const telefoneLoja = bakerySettings.phone?.replace(/\D/g, '')
            const link = telefoneLoja
              ? `https://wa.me/55${telefoneLoja}?text=${encodeURIComponent(message)}`
              : `https://wa.me/?text=${encodeURIComponent(message)}`

            window.open(link, '_blank')
            setIsSubmitting(false);
            navigate(`/catalogo/${userId}`);
          } else if (statusData?.rejected) {
            clearInterval(pollInterval);
            setIsPolling(false);
            setPixModalOpen(false);
            await supabase.from('orders').delete().eq('id', pedido.id);
            toast.error('O pagamento foi recusado ou cancelado.', { duration: 5000 });
            setIsSubmitting(false);
          }
        }, 5000);

        return; // não abre whatsapp e nem insere o pedido (aguarda o poll)
      }

      // Se não for pagamento online, insere o orçamento e manda pro WhatsApp
      await createOrderInDatabase('orcamento', form.metodoPagamento, userId);

      const message = generateWhatsAppMessage()
      const telefoneLoja = bakerySettings.phone?.replace(/\D/g, '')
      const link = telefoneLoja
        ? `https://wa.me/55${telefoneLoja}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`

      toast.success('Pedido enviado com sucesso! Redirecionando...', {
        description: 'Você será redirecionado para o catálogo.',
        duration: 3000
      })

      setTimeout(() => {
        window.open(link, '_blank')
        navigate(`/catalogo/${userId}`)
      }, 1500)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Erro ao processar pedido. Por favor, tente novamente.')
      setIsSubmitting(false)
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

            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="querEntrega"
                checked={form.querEntrega}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, querEntrega: checked === true }))}
              />
              <Label htmlFor="querEntrega" className="flex items-center gap-2 cursor-pointer">
                {form.querEntrega ? <Truck className="w-4 h-4 text-green-600" /> : <Store className="w-4 h-4 text-blue-600" />}
                Deseja entrega?
              </Label>
            </div>

            {form.querEntrega && (
              <Input name="endereco" placeholder="Endereço completo" value={form.endereco} onChange={handleChange} required />
            )}

            <div className="space-y-3 pt-2">
              <Label className="text-base font-semibold">Forma de Pagamento</Label>
              <RadioGroup
                value={form.metodoPagamento}
                onValueChange={(value) => setForm(prev => ({ ...prev, metodoPagamento: value }))}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <RadioGroupItem value="dinheiro" id="dinheiro" />
                  <Label htmlFor="dinheiro" className="flex items-center gap-2 cursor-pointer">
                    <Banknote className="w-4 h-4 text-green-600" /> Dinheiro
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex items-center gap-2 cursor-pointer">
                    <QrCode className="w-4 h-4 text-purple-600" /> Pix
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <RadioGroupItem value="cartao" id="cartao" />
                  <Label htmlFor="cartao" className="flex items-center gap-2 cursor-pointer">
                    <CreditCard className="w-4 h-4 text-blue-600" /> Cartão
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <RadioGroupItem value="link" id="link" />
                  <Label htmlFor="link" className="flex items-center gap-2 cursor-pointer">
                    <LinkIcon className="w-4 h-4 text-orange-600" /> Link
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Input name="dataEntrega" type="date" placeholder="Data de entrega" value={form.dataEntrega} onChange={handleChange} required />
          </div>

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-6 bg-green-600 hover:bg-green-700">
            {isSubmitting ? (
              <span>Processando...</span>
            ) : (bakerySettings?.payment_enabled && ['pix', 'cartao', 'link'].includes(form.metodoPagamento)) ? (
              <span className="flex items-center">
                <CreditCard className="w-4 h-4 mr-2" /> Pagar Online Agora
              </span>
            ) : (
              <span className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Enviar Pedido via WhatsApp
              </span>
            )}
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

      {/* Modal PIX */}
      {pixModalOpen && pixData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full space-y-5 text-center shadow-2xl relative animate-in zoom-in-95 duration-200">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 hover:bg-gray-100 rounded-full"
              onClick={() => navigate(`/catalogo/${bakerySettings.id}`)}
              title="Fechar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </Button>

            <div className="space-y-1">
              <h3 className="text-xl font-bold pt-2 text-gray-900">Aguardando Pagamento</h3>
              <p className="text-sm text-gray-500">
                {pixData.type === 'pix' ? 'Escaneie o QR Code abaixo no app do seu banco ou copie o código PIX.' : 'Complete o pagamento na nova aba que se abriu para prosseguir.'}
              </p>
            </div>

            {pixData.type === 'pix' && pixData.qr_code_base64 && (
              <img
                src={`data:image/jpeg;base64,${pixData.qr_code_base64}`}
                alt="QR Code Pix"
                className="mx-auto w-56 h-56 border rounded-xl p-3 shadow-sm bg-white"
              />
            )}

            {pixData.type === 'pix' && !pixData.qr_code_base64 && (
              <QrCode className="mx-auto w-40 h-40 text-gray-300" />
            )}

            {pixData.type === 'cartao' && (
              <CreditCard className="mx-auto w-24 h-24 text-blue-500 animate-pulse my-4" />
            )}

            {pixData.type === 'cartao' && pixData.init_point && (
              <Button variant="outline" className="w-full mt-2 border-blue-200 text-blue-600 hover:bg-blue-50" onClick={() => window.open(pixData.init_point, '_blank')}>
                <LinkIcon className="w-4 h-4 mr-2" /> Reabrir página de Pagamento
              </Button>
            )}

            {pixData.type === 'pix' && pixData.qr_code && (
              <div className="space-y-2 text-left">
                <Label className="text-xs font-semibold text-gray-600 ml-1">PIX Copia e Cola:</Label>
                <div className="bg-gray-50 p-3 rounded-lg border flex items-center gap-3 w-full group hover:border-blue-300 transition-colors">
                  <span className="text-xs text-gray-600 truncate flex-1 font-mono">{pixData.qr_code}</span>
                  <Button
                    size="sm"
                    className="shrink-0 bg-blue-600 hover:bg-blue-700 h-8"
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.qr_code!);
                      toast.success("Código PIX Copiado!");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center p-2 rounded-lg bg-orange-50 border border-orange-100 mt-2">
              <span className="text-sm text-orange-600 font-medium flex items-center">
                {isPolling ? (
                  <span className="flex items-center text-left">
                    <span className="animate-spin w-4 h-4 rounded-full border-2 border-orange-500 border-t-transparent mr-2 shrink-0" />
                    Aguardando confirmação. O pedido ficará salvo em nosso sistema como pendente.
                  </span>
                ) : (
                  "Processando..."
                )}
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={async () => {
                setPixModalOpen(false);
                setIsSubmitting(false);
                if (pixData?.external_reference) {
                  await supabase.from('orders').delete().eq('id', pixData.external_reference);
                  toast.info('Orçamento descartado.');
                }
              }}
            >
              Cancelar Pedido
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}

export default FinalizarPedido
