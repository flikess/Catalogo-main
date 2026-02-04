import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus, Printer, MessageCircle, Trash2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showSuccess, showError } from '@/utils/toast'

interface Order {
  id: string
  client_name: string
  total_amount: number
  discount_percentage: number
  delivery_fee: number
  payment_method?: string
  status: string
  delivery_date?: string
  notes?: string
  created_at: string
  order_items?: OrderItem[]
}

interface OrderItem {
  id: string
  product_id?: string
  product_name: string
  size?: SizeOption | string | null
  quantity: number
  unit_price: number
  total_price: number
  adicionais?: Additional[]
}

interface SizeOption {
  name: string
  price: number
}

interface Product {
  id: string
  name: string
  price: number
  adicionais?: Additional[]
  sizes?: SizeOption[]
}

interface Additional {
  name: string
  price: number
}

interface BakerySettings {
  bakery_name?: string
  email?: string
  phone?: string
  pix_key?: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
}

const statusOptions = [
  { value: 'orcamento', label: 'Orçamento', color: 'bg-gray-100 text-gray-800' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-blue-100 text-blue-800' },
  { value: 'producao', label: 'Em Produção', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pronto', label: 'Pronto', color: 'bg-green-100 text-green-800' },
  { value: 'entregue', label: 'Entregue', color: 'bg-purple-100 text-purple-800' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800' }
]

const PedidoDetalhes = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [order, setOrder] = useState<Order | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [bakerySettings, setBakerySettings] = useState<BakerySettings>({})
  const [loading, setLoading] = useState(true)
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false)

  const [newItem, setNewItem] = useState<{
  product_id: string
  product_name: string
  size: SizeOption | null
  quantity: number
  unit_price: number
  selectedAdditionais: Additional[]
}>({
  product_id: '',
  product_name: '',
  size: null,
  quantity: 1,
  unit_price: 0,
  selectedAdditionais: []
})


  useEffect(() => {
  if (!user || !id) return

  fetchOrder()
  fetchProducts()
  fetchBakerySettings()
}, [user, id])


  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product_name,
            size,
            quantity,
            unit_price,
            total_price,
            adicionais
          )
        `)
        .eq('id', id)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error

      setOrder(data)
    } catch (error) {
      console.error(error)
      showError('Erro ao carregar pedido')
      navigate('/pedidos')
    } finally {
      setLoading(false)
    }
  }


  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, adicionais, sizes')
        .eq('user_id', user?.id)
        .order('name')

      if (error) throw error

      setProducts(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const fetchBakerySettings = async () => {
  try {
    const { data, error } = await supabase
      .from('bakery_settings')
      .select('*')
      .eq('id', user?.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error

    if (data) setBakerySettings(data)
  } catch (error) {
    console.error(error)
  }
}


  const getItemVariationLabel = (item: OrderItem) => {
  // prioridade para o campo novo
  if ((item as any).variation_label) {
    return (item as any).variation_label
  }

  // fallback para o size antigo
  if (!item.size) return null

  if (typeof item.size === 'string') return item.size

  if (typeof item.size === 'object' && (item.size as any).name) {
    return (item.size as any).name
  }

  return null
}


  const handleAddItem = async () => {
    const selectedProduct = products.find(p => p.id === newItem.product_id)

    const hasSizes = selectedProduct?.sizes && selectedProduct.sizes.length > 0

    if (
      !order ||
      !newItem.product_name ||
      newItem.quantity <= 0 ||
      newItem.unit_price <= 0 ||
      (hasSizes && !newItem.size)
    ) {
      showError('Preencha todos os campos obrigatórios')
      return
    }

    try {
      const additionaisTotal = newItem.selectedAdditionais.reduce(
        (sum, add) => sum + add.price,
        0
      )

      const totalPrice =
        newItem.quantity * (newItem.unit_price + additionaisTotal)

      const { error } = await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: newItem.product_id || null,
        product_name: newItem.product_name,
        size: newItem.size,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price,
        total_price: totalPrice,
        adicionais:
          newItem.selectedAdditionais.length > 0
            ? newItem.selectedAdditionais
            : null
      })

      if (error) throw error

      await supabase
        .from('orders')
        .update({
          total_amount: (order.total_amount || 0) + totalPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id)

      showSuccess('Item adicionado com sucesso!')

      setIsAddItemDialogOpen(false)
      setNewItem({
        product_id: '',
        product_name: '',
        size: null,
        quantity: 1,
        unit_price: 0,
        selectedAdditionais: []
      })

      fetchOrder()
    } catch (error) {
      console.error(error)
      showError('Erro ao adicionar item')
    }
  }

  const handleRemoveItem = async (itemId: string, itemTotal: number) => {
    if (!confirm('Tem certeza que deseja remover este item?')) return

    try {
      const { error } = await supabase.from('order_items').delete().eq('id', itemId)

      if (error) throw error

      await supabase
        .from('orders')
        .update({
          total_amount: Math.max(
            0,
            (order?.total_amount || 0) - itemTotal
          ),
          updated_at: new Date().toISOString()
        })
        .eq('id', order?.id)

      showSuccess('Item removido com sucesso!')
      fetchOrder()
    } catch (error) {
      console.error(error)
      showError('Erro ao remover item')
    }
  }

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    if (!order) return

    const message = generateWhatsAppMessage()
    const encoded = encodeURIComponent(message)

    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const generateWhatsAppMessage = () => {
    if (!order) return ''

    const itemsText =
      order.order_items?.map((item, index) => {
        const sizeLabel = getItemVariationLabel(item)
  ? ` | Tamanho: ${getItemVariationLabel(item)}`
  : ''

        const additionalsText =
          item.adicionais && item.adicionais.length > 0
            ? `\n   Adicionais: ${item.adicionais
                .map(a => `${a.name} (+${formatPrice(a.price)})`)
                .join(', ')}`
            : ''

        return (
          `*${index + 1}. ${item.product_name}*${sizeLabel}\n` +
          `   Quantidade: ${item.quantity}\n` +
          `   Valor unitário: ${formatPrice(item.unit_price)}\n` +
          additionalsText +
          `\n   Subtotal: ${formatPrice(item.total_price)}`
        )
      }).join('\n\n') || ''

    return `Olá, ${order.client_name || 'cliente'}! 👋

Segue o resumo do seu pedido:

*Pedido nº ${order.id}*

${itemsText}

-------------------------
*Total do pedido: ${formatPrice(calculateTotal())}*

Qualquer dúvida, fico à disposição.
Muito obrigado pela preferência!`
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price || 0)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('pt-BR')

  const getStatusBadge = (status: string) =>
    statusOptions.find(o => o.value === status) || statusOptions[0]

  const calculateSubtotal = () =>
    order?.order_items?.reduce((sum, item) => sum + item.total_price, 0) || 0

  const calculateDiscount = () =>
    calculateSubtotal() * ((order?.discount_percentage || 0) / 100)

  const calculateTotal = () =>
    calculateSubtotal() -
    calculateDiscount() +
    (order?.delivery_fee || 0)

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600" />
        </div>
      </Layout>
    )
  }

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-gray-500">Pedido não encontrado</p>
          <Button onClick={() => navigate('/pedidos')} className="mt-4">
            Voltar para Pedidos
          </Button>
        </div>
      </Layout>
    )
  }

  const statusBadge = getStatusBadge(order.status)

  return (
    <Layout>
      
      <div
  id="print-area"
  className="hidden print:block text-[11px] font-mono"
>


  <div className="text-center mb-2 leading-tight">
  <div className="font-bold text-sm">
    {bakerySettings.bakery_name || 'Minha Loja'}
  </div>

  {(bakerySettings.address_street || bakerySettings.address_city) && (
    <div>
      {[
        bakerySettings.address_street,
        bakerySettings.address_number,
        bakerySettings.address_neighborhood,
        bakerySettings.address_city,
        bakerySettings.address_state
      ]
        .filter(Boolean)
        .join(', ')}
    </div>
  )}

  {bakerySettings.phone && (
    <div>Tel: {bakerySettings.phone}</div>
  )}

  {bakerySettings.email && (
    <div>{bakerySettings.email}</div>
  )}
</div>

  

  <div className="border-t border-dashed my-2" />

  <div>
    Pedido: {order.id.slice(0, 8)}<br />
    Data: {formatDate(order.created_at)}<br />
    Cliente: {order.client_name}
  </div>

  <div className="border-t border-dashed my-2" />

  <div>
    {order.order_items?.map((item, i) => (
      <div key={item.id} className="mb-2">
        <div>
          {item.quantity}x {item.product_name}
        </div>

        {getItemVariationLabel(item) && (
          <div className="pl-2">
            Tam: {getItemVariationLabel(item)}
          </div>
        )}

        {item.adicionais?.map((a, idx) => (
          <div key={idx} className="pl-2">
            + {a.name} ({formatPrice(a.price)})
          </div>
        ))}

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatPrice(item.total_price)}</span>
        </div>
      </div>
    ))}
  </div>

  <div className="border-t border-dashed my-2" />

  <div className="space-y-1">
    <div className="flex justify-between">
      <span>Subtotal</span>
      <span>{formatPrice(calculateSubtotal())}</span>
    </div>

    {order.discount_percentage > 0 && (
      <div className="flex justify-between">
        <span>Desconto</span>
        <span>-{formatPrice(calculateDiscount())}</span>
      </div>
    )}

    {order.delivery_fee > 0 && (
      <div className="flex justify-between">
        <span>Entrega</span>
        <span>{formatPrice(order.delivery_fee)}</span>
      </div>
    )}

    <div className="border-t border-dashed my-1" />

    <div className="flex justify-between font-bold text-sm">
      <span>TOTAL</span>
      <span>{formatPrice(calculateTotal())}</span>
    </div>
  </div>

  <div className="border-t border-dashed my-2" />

  {bakerySettings.pix_key && (
    <div>
      PIX: {bakerySettings.pix_key}
    </div>
  )}

  <div className="text-center mt-3">
    Documento sem valor fiscal
  </div>
  </div>

<div className="space-y-6 print:hidden">

  {/* Header */}
  <div className="flex justify-between items-center print:hidden">

          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/pedidos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              Pedido #{order.id.slice(0, 8)}
            </h1>
            <Badge className={statusBadge.color}>
              {statusBadge.label}
            </Badge>
          </div>
        </div>

        {/* Action Buttons - Hidden in print */}
        <div className="flex gap-4 print:hidden">
          <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </DialogTrigger>
         <DialogContent className="max-w-md">
  <DialogHeader>
    <DialogTitle>Adicionar Item ao Pedido</DialogTitle>
  </DialogHeader>
  <div className="space-y-4">
    <div className="space-y-2">
      <Label>Produto</Label>
      <Select 
        value={newItem.product_id} 
        onValueChange={(value) => {
          const product = products.find(p => p.id === value)
          setNewItem({
            ...newItem,
            product_id: value,
            product_name: product?.name || '',
            unit_price: product?.price || 0,
            size: '',
            selectedAdditionais: []
          })
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um produto..." />
        </SelectTrigger>
        <SelectContent>
          {products.map(product => (
            <SelectItem key={product.id} value={product.id}>
              {product.name} - {formatPrice(product.price)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    {newItem.product_id &&
  products.find(p => p.id === newItem.product_id)?.sizes?.length > 0 && (

  <div className="space-y-2">
    <Label>Tamanho / Variação</Label>

    <Select
      value={newItem.size?.name || ''}
    onValueChange={(value) => {
  const product = products.find(p => p.id === newItem.product_id)
  const size = product?.sizes?.find(s => s.name === value) || null

  setNewItem({
    ...newItem,
    size,
    unit_price: size?.price ?? newItem.unit_price
  })
}}

    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione um tamanho..." />
      </SelectTrigger>

      <SelectContent>
        {products
          .find(p => p.id === newItem.product_id)
          ?.sizes?.map((s, i) => (
            <SelectItem key={i} value={s.name}>
              {s.name} – {formatPrice(s.price)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
)}
     {newItem.product_id && products.find(p => p.id === newItem.product_id)?.adicionais?.length > 0 && (
      <div className="space-y-2">
        <Label>Adicionais:</Label>
        <div className="space-y-2">
          {products.find(p => p.id === newItem.product_id)?.adicionais?.map((add, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newItem.selectedAdditionais.some(a => a.name === add.name)}
                  onChange={() => {
                    const exists = newItem.selectedAdditionais.some(a => a.name === add.name)
                    if (exists) {
                      setNewItem({
                        ...newItem,
                        selectedAdditionais: newItem.selectedAdditionais.filter(a => a.name !== add.name)
                      })
                    } else {
                      setNewItem({
                        ...newItem,
                        selectedAdditionais: [...newItem.selectedAdditionais, add]
                      })
                    }
                  }}
                  className="mr-2"
                />
                <span>{add.name}</span>
              </div>
              <span className="text-sm text-green-600">+{formatPrice(add.price)}</span>
            </div>
          ))}
        </div>
      </div>
    )}

                <div className="space-y-2">
                  <Label htmlFor="product_name">Nome do Produto *</Label>
                  <Input
                    id="product_name"
                    value={newItem.product_name}
                    onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                    placeholder="Nome do produto"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Preço Unitário *</Label>
                    <Input
  id="unit_price"
  type="number"
  disabled={
    products.find(p => p.id === newItem.product_id)?.sizes?.length > 0
  }
                      step="0.01"
                      min="0"
                      value={newItem.unit_price}
                      onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Total do Item</Label>
                  <div className="text-lg font-bold text-green-600">
                   {formatPrice(
  newItem.quantity *
  (newItem.unit_price +
    newItem.selectedAdditionais.reduce((s, a) => s + a.price, 0))
)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddItem} className="flex-1">
                    Adicionar Item
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAddItemDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>

          <Button onClick={handleWhatsApp} variant="outline">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar WhatsApp
          </Button>
        </div>

        {/* Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Número</Label>
                  <p className="font-mono">#{order.id.slice(0, 8)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge className={statusBadge.color}>
                      {statusBadge.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Cliente</Label>
                  <p>{order.client_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Data do Pedido</Label>
                  <p>{formatDate(order.created_at)}</p>
                </div>
              </div>

              {order.delivery_date && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Data de Entrega</Label>
                  <p>{formatDate(order.delivery_date)}</p>
                </div>
              )}

              {order.payment_method && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Forma de Pagamento</Label>
                  <p>{order.payment_method}</p>
                </div>
              )}

              {order.notes && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Observações</Label>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bakery Info */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bakerySettings.bakery_name && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Nome</Label>
                  <p>{bakerySettings.bakery_name}</p>
                </div>
              )}
              
              {bakerySettings.phone && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Telefone</Label>
                  <p>{bakerySettings.phone}</p>
                </div>
              )}
              
              {bakerySettings.email && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">E-mail</Label>
                  <p>{bakerySettings.email}</p>
                </div>
              )}
   {bakerySettings.pix_key && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Chave Pix</Label>
                  <p>{bakerySettings.pix_key}</p>
                </div>
              )}

              {(bakerySettings.address_street || bakerySettings.address_city) && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Endereço</Label>
                  <p className="text-sm">
                    {[
                      bakerySettings.address_street,
                      bakerySettings.address_number,
                      bakerySettings.address_neighborhood,
                      bakerySettings.address_city,
                      bakerySettings.address_state
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card>
          <CardHeader>
            <CardTitle>Itens do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            {order.order_items && order.order_items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right print:hidden">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items.map((item) => (
               <TableRow key={item.id}>
  <TableCell className="font-medium">
    <div>{item.product_name}</div>

{getItemVariationLabel(item) && (
  <div className="text-xs text-muted-foreground">
    Tamanho: {getItemVariationLabel(item)}
  </div>
)}
    {item.adicionais && item.adicionais.length > 0 && (
      <div className="text-xs text-muted-foreground mt-1">
        Adicionais: {item.adicionais.map(a => `${a.name} (+${formatPrice(a.price)})`).join(', ')}
      </div>
    )}
  </TableCell>
  <TableCell className="text-center">{item.quantity}</TableCell>
  <TableCell className="text-right">{formatPrice(item.unit_price)}</TableCell>
  <TableCell className="text-right font-medium">
    {formatPrice(item.total_price)}
  </TableCell>
  <TableCell className="text-right print:hidden">
    <Button
      variant="outline"
      size="sm"
      onClick={() => handleRemoveItem(item.id, item.total_price)}
      className="text-red-600 hover:text-red-700"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  </TableCell>
</TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Nenhum item no pedido
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Totals */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatPrice(calculateSubtotal())}</span>
              </div>
              
              {order.discount_percentage > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Desconto ({order.discount_percentage}%):</span>
                  <span>-{formatPrice(calculateDiscount())}</span>
                </div>
              )}
              
              {order.delivery_fee > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de Entrega:</span>
                  <span>{formatPrice(order.delivery_fee)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span className="text-green-600">{formatPrice(calculateTotal())}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default PedidoDetalhes
