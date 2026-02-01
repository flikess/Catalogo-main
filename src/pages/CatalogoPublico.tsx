import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Phone, Mail, MapPin, MessageCircle, Image as ImageIcon, Plus, Minus, Trash2, ShoppingCart, ArrowLeft, AlertTriangle, Eye, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'

interface Additional {
  id?: string
  name: string
  price: number
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  image_url?: string
  categoria_id?: string
  categorias_produtos?: {
    nome: string
  }
  adicionais?: Additional[]
}

interface Category {
  id: string
  nome: string
  products: Product[]
}

interface BakerySettings {
  bakery_name?: string
  email?: string
  phone?: string
  address_street?: string
  address_number?: string
  address_neighborhood?: string
  address_city?: string
  address_state?: string
  logo_url?: string
  presentation_message?: string
}

interface CartItem extends Product {
  quantity: number
  selectedAdditionais: Additional[]
}

const CatalogoPublico = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [bakerySettings, setBakerySettings] = useState<BakerySettings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [selectedAdditionais, setSelectedAdditionais] = useState<Record<string, boolean>>({})
  const [quantity, setQuantity] = useState(1)
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (userId) {
      fetchCatalogData()
      recordCatalogView()
    } else {
      setError('ID do catálogo não fornecido.')
      setLoading(false)
    }
  }, [userId])

  const recordCatalogView = async () => {
    if (!userId) return
    try {
      await supabase.from('catalog_views').insert({ user_id: userId })
    } catch (err) {
      console.error('Failed to record catalog view:', err)
    }
  }

  const recordCartAdd = async (productId: string) => {
    if (!userId) return
    try {
      await supabase.from('cart_adds').insert({ user_id: userId, product_id: productId })
    } catch (err) {
      console.error('Failed to record cart add:', err)
    }
  }

  const fetchCatalogData = async () => {
    try {
      setLoading(true)
      
      const { data: settingsData, error: settingsError } = await supabase
        .from('bakery_settings')
        .select('*')
        .eq('id', userId)
        .single()

      if (settingsError && settingsError.code === 'PGRST116') {
        setError('Catálogo não encontrado.')
        return
      }
      if (settingsError) throw settingsError

      setBakerySettings(settingsData || {})

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id, name, description, price, image_url, categoria_id, adicionais,
          categorias_produtos (
            nome
          )
        `)
        .eq('user_id', userId)
        .eq('show_in_catalog', true)
        .order('name')

      if (productsError) throw productsError

      const groupedProducts: { [key: string]: Category } = {}
      productsData?.forEach(product => {
        const categoryName = product.categorias_produtos?.nome || 'Outros'
        const categoryId = product.categoria_id || 'outros'
        
        if (!groupedProducts[categoryId]) {
          groupedProducts[categoryId] = {
            id: categoryId,
            nome: categoryName,
            products: []
          }
        }
        groupedProducts[categoryId].products.push(product)
      })

      setCategories(Object.values(groupedProducts))
    } catch (err) {
      console.error('Error fetching catalog data:', err)
      setError('Erro ao carregar catálogo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySelect = (categoryId: string) => {
    const element = categoryRefs.current[categoryId]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const openProductModal = (product: Product) => {
    setViewingProduct(product)
    setSelectedAdditionais({})
    setQuantity(1)
  }

  const closeProductModal = () => {
    setViewingProduct(null)
  }

  const handleAdditionalToggle = (additionalId: string) => {
    setSelectedAdditionais(prev => ({
      ...prev,
      [additionalId]: !prev[additionalId]
    }))
  }

  const addToCartWithAdditionais = () => {
    if (!viewingProduct) return
    
    const selectedAdds = viewingProduct.adicionais?.filter(add => 
      selectedAdditionais[add.id || add.name]
    ) || []
    
    setCart(prevCart => {
      const itemKey = `${viewingProduct.id}-${JSON.stringify(selectedAdds)}`
      
      const existingIndex = prevCart.findIndex(item => 
        `${item.id}-${JSON.stringify(item.selectedAdditionais)}` === itemKey
      )
      
      if (existingIndex >= 0) {
        const newCart = [...prevCart]
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + quantity
        }
        return newCart
      }
      
      return [...prevCart, { 
        ...viewingProduct, 
        quantity,
        selectedAdditionais: selectedAdds 
      }]
    })
    
    showSuccess(`${viewingProduct.name} adicionado ao orçamento!`)
    recordCartAdd(viewingProduct.id)
    closeProductModal()
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
    setCart(prevCart => {
      if (newQuantity <= 0) {
        return prevCart.filter(item => item.id !== productId)
      }
      return prevCart.map(item => 
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  const cartTotal = cart.reduce((sum, item) => {
    const additionaisTotal = item.selectedAdditionais?.reduce((addSum, add) => addSum + add.price, 0) || 0
    return sum + ((item.price + additionaisTotal) * item.quantity)
  }, 0)

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const handleWhatsApp = () => {
    const message = "Olá, gostaria de tirar uma dúvida."
    const encodedMessage = encodeURIComponent(message)
    const phone = bakerySettings.phone?.replace(/\D/g, '')
    
    if (phone) {
      const whatsappUrl = `https://wa.me/55${phone}?text=${encodedMessage}`
      window.open(whatsappUrl, '_blank')
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
      window.open(whatsappUrl, '_blank')
    }
  }

  const generateWhatsAppMessage = () => {
    if (cart.length === 0) return 'Olá! Gostaria de fazer um orçamento.'

    const itemsText = cart.map(item => {
      let itemText = `• ${item.name} - ${item.quantity}x ${formatPrice(item.price)}`
      
      if (item.selectedAdditionais && item.selectedAdditionais.length > 0) {
        itemText += `\n   Adicionais: ${item.selectedAdditionais.map(a => `${a.name} (+${formatPrice(a.price)})`).join(', ')}`
      }
      
      return itemText
    }).join('\n')

    return `Olá, *${bakerySettings.bakery_name || 'Loja'}*!

Gostaria de solicitar um orçamento com os seguintes itens:

*ITENS:*
${itemsText}

💰 *VALOR TOTAL ESTIMADO: ${formatPrice(cartTotal)}*

Aguardo o contato para finalizar o pedido.
Obrigado!
`
  }

  const getFullAddress = () => {
    const addressParts = [
      bakerySettings.address_street,
      bakerySettings.address_number,
      bakerySettings.address_neighborhood,
      bakerySettings.address_city,
      bakerySettings.address_state
    ].filter(Boolean)
    
    return addressParts.join(', ')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{error}</h1>
          <p className="text-gray-600 mb-6">
            Verifique o link ou entre em contato com a Loja.
          </p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para a página inicial
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header do Catálogo */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="text-center">
            {bakerySettings.logo_url && (
              <div className="mb-6">
                <img 
                  src={bakerySettings.logo_url} 
                  alt="Logo" 
                  className="w-36 h-36 object-cover rounded-full mx-auto shadow-lg"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </div>
            )}
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {bakerySettings.bakery_name || 'Loja'}
            </h1>
{bakerySettings.presentation_message && (
<p className="text-sm text-gray-600 italic mb-3 max-w-2xl mx-auto">
    {`"${bakerySettings.presentation_message}"`}
  </p>
)}
            
<div className="flex flex-wrap justify-center gap-3 text-gray-600 mb-3 text-sm">
              {bakerySettings.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{bakerySettings.phone}</span>
                </div>
              )}
              
              {bakerySettings.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{bakerySettings.email}</span>
                </div>
              )}
              
              {getFullAddress() && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{getFullAddress()}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                onClick={handleWhatsApp}
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Fale comigo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro de Categorias por Dropdown */}
<div className="sticky top-0 bg-white/80 backdrop-blur-sm z-40 py-2 border-b">
        <div className="max-w-6xl mx-auto px-4 flex justify-center">
          <Select onValueChange={handleCategorySelect}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Navegar por categorias..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Produtos */}
<div className="max-w-6xl mx-auto px-4 py-4">
        {categories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <ImageIcon className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum produto disponível
            </h3>
            <p className="text-gray-500">
              Este catálogo ainda não possui produtos para exibir.
            </p>
          </div>
        ) : (
          categories.map((category) => (
            <div 
              key={category.id} 
              id={category.id}
              ref={el => categoryRefs.current[category.id] = el}
              className="mb-6 pt-8 -mt-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b pb-1">
                {category.nome}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {category.products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                    <div className="aspect-square relative bg-gray-100">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                        <ImageIcon className="w-16 h-16 text-gray-400" />
                      </div>
                    </div>
                    
                    <CardContent className="p-3 flex flex-col flex-grow">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      {product.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-3 flex-grow">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-auto">
                        <Badge variant="secondary" className="text-lg font-bold text-green-700 bg-green-100">
                          {formatPrice(product.price)}
                        </Badge>
                        
                        <Button 
                          size="sm" 
                          onClick={() => openProductModal(product)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Visualização do Produto */}
      {viewingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold">{viewingProduct.name}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={closeProductModal}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Carrossel de imagens */}
                <div>
                  {viewingProduct.image_url ? (
                    <img 
                      src={viewingProduct.image_url} 
                      alt={viewingProduct.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Detalhes do produto */}
               <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-lg">Descrição</h4>
                    <p className="text-gray-600">
                      {viewingProduct.description || 'Nenhuma descrição fornecida.'}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-lg">Preço</h4>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPrice(viewingProduct.price)}
                    </p>
                  </div>
                  
                  {/* Adicionais */}
                  {viewingProduct.adicionais && viewingProduct.adicionais.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Adicionais</h4>
                      <div className="space-y-2">
                        {viewingProduct.adicionais.map((additional) => (
                          <div 
                            key={additional.id || additional.name}
                            className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                            onClick={() => handleAdditionalToggle(additional.id || additional.name)}
                          >
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={!!selectedAdditionais[additional.id || additional.name]}
                                onChange={() => handleAdditionalToggle(additional.id || additional.name)}
                                className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{additional.name}</span>
                            </div>
                            <span className="text-green-600">
                              +{formatPrice(additional.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Quantidade */}
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Quantidade</h4>
                    <div className="flex items-center gap-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-lg font-medium">{quantity}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setQuantity(prev => prev + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Botões de ação */}
                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="outline"
                      onClick={closeProductModal}
                      className="flex-1"
                    >
                      Continuar Comprando
                    </Button>
                    <Button 
                      onClick={addToCartWithAdditionais}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      Adicionar ao Carrinho
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Carrinho Flutuante */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button onClick={() => setIsCartOpen(!isCartOpen)} className="h-12 px-6 shadow-lg">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ver Orçamento
            <Badge className="ml-2">{cartItemCount}</Badge>
          </Button>
        </div>
      )}

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsCartOpen(false)}>
          <div 
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-lg p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-6">Orçamento</h2>
            
            {cart.length === 0 ? (
              <p className="text-gray-500">Seu carrinho está vazio.</p>
            ) : (
              <div className="flex-grow overflow-y-auto -mx-6 px-6">
                {cart.map(item => (
                  <div key={item.id + JSON.stringify(item.selectedAdditionais)} className="flex items-center gap-4 mb-4">
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-16 h-16 object-cover rounded-md"
                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                    />
                    <div className="flex-grow">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{formatPrice(item.price)}</p>
                      
                      {item.selectedAdditionais && item.selectedAdditionais.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          Adicionais: {item.selectedAdditionais.map(a => `${a.name} (+${formatPrice(a.price)})`).join(', ')}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value)
                            if (!isNaN(value)) updateQuantity(item.id, value)
                          }}
                          className="w-16 text-center border rounded-md px-2 py-1"
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-auto border-t pt-6">
              <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total Estimado:</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <Button
                onClick={() => navigate('/finalizar', { 
                  state: { 
                    cart, 
                    cartTotal, 
                    bakerySettings 
                  } 
                })}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Finalizar Pedido
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-8">

        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} {bakerySettings.bakery_name || 'Loja'}. Todos os direitos reservados.</p>
          <p className="mt-2 text-sm">Catálogo online - Entre em contato para fazer seu pedido!</p>
        </div>
      </footer>
    </div>
  )
}

export default CatalogoPublico
