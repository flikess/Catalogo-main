import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Image as ImageIcon,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ArrowLeft,
  AlertTriangle,
  Eye,
  X,
  LayoutGrid,
  List
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess } from '@/utils/toast'

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
  banner_url?: string
  presentation_message?: string
}

interface CartItem extends Product {
  quantity: number
  selectedAdditionais: Additional[]
}

type ViewMode = 'grid' | 'list'

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

  const [viewMode, setViewMode] = useState<ViewMode>('grid')

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

    const selectedAdds =
      viewingProduct.adicionais?.filter(add =>
        selectedAdditionais[add.id || add.name]
      ) || []

    setCart(prevCart => {
      const itemKey = `${viewingProduct.id}-${JSON.stringify(selectedAdds)}`

      const existingIndex = prevCart.findIndex(
        item =>
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

      return [
        ...prevCart,
        {
          ...viewingProduct,
          quantity,
          selectedAdditionais: selectedAdds
        }
      ]
    })

    showSuccess(`${viewingProduct.name} adicionado ao orçamento!`)
    recordCartAdd(viewingProduct.id)
    closeProductModal()
  }

  const updateQuantity = (productId: string, newQuantity: number) => {
  setCart(prevCart =>
    prevCart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    )
  )
}

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId))
  }

  const cartTotal = cart.reduce((sum, item) => {
    const additionaisTotal =
      item.selectedAdditionais?.reduce((addSum, add) => addSum + add.price, 0) || 0

    return sum + (item.price + additionaisTotal) * item.quantity
  }, 0)

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const handleWhatsApp = () => {
    const message = 'Olá, gostaria de tirar uma dúvida.'
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
{/* Header */}
<div
  className={`relative ${!bakerySettings.banner_url ? 'bg-white shadow-sm' : ''}`}
  style={
    bakerySettings.banner_url
      ? {
          backgroundImage: `url(${bakerySettings.banner_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }
      : undefined
  }
>
  {/* overlay só quando tiver banner */}
  {bakerySettings.banner_url && (
    <div className="absolute inset-0 bg-black/40" />
  )}

  <div className="relative">
    <div
      className={`max-w-6xl mx-auto px-4 py-8 text-center
        ${bakerySettings.banner_url ? 'text-white' : 'text-gray-900'}
      `}
    >

      {bakerySettings.logo_url && (
        <div className="mb-4 flex justify-center">
          <img
            src={bakerySettings.logo_url}
            alt="Logo"
            className="w-28 h-28 object-cover rounded-full border-4 border-white shadow-lg bg-white"
            onError={e => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      <h1 className="text-3xl font-bold mb-2">
        {bakerySettings.bakery_name || 'Loja'}
      </h1>

      {bakerySettings.presentation_message && (
        <p
          className={`text-sm italic max-w-2xl mx-auto mb-3
            ${bakerySettings.banner_url ? 'opacity-90' : 'text-gray-600'}
          `}
        >
          {bakerySettings.presentation_message}
        </p>
      )}

      <div
        className={`flex flex-wrap justify-center gap-3 text-sm
          ${bakerySettings.banner_url ? 'opacity-95' : 'text-gray-600'}
        `}
      >
        {bakerySettings.phone && (
          <div className="flex items-center gap-1">
            <Phone className="w-4 h-4" />
            <span>{bakerySettings.phone}</span>
          </div>
        )}

        {bakerySettings.email && (
          <div className="flex items-center gap-1">
            <Mail className="w-4 h-4" />
            <span>{bakerySettings.email}</span>
          </div>
        )}

        {getFullAddress() && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{getFullAddress()}</span>
          </div>
        )}
      </div>

      <div className="mt-4">
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



      {/* Filtro + modo de visualização */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-40 py-2 border-b">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row gap-2 items-center justify-between">

          <Select onValueChange={handleCategorySelect}>
            <SelectTrigger className="w-[260px]">
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

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Grade
            </Button>

            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-1" />
              Lista
            </Button>
          </div>
        </div>
      </div>
            {/* Lista de categorias e produtos */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">

        {categories.map(category => (
          <div
            key={category.id}
            ref={el => (categoryRefs.current[category.id] = el)}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-gray-900">
              {category.nome}
            </h2>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {category.products.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => openProductModal(product)}
                  >
                    <CardContent className="p-3 flex flex-col h-full">
                      <div className="relative mb-2">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-32 object-cover rounded"
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <h3 className="font-semibold text-sm mb-1">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          {product.description}
                        </p>
                      )}

                      <div className="mt-auto flex items-center justify-between">
                        <span className="font-bold text-blue-600">
                          {formatPrice(product.price)}
                        </span>

                        <Button size="icon" variant="ghost">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {category.products.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openProductModal(product)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      <div className="w-20 h-20 shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
                            onError={e => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">
                          {product.name}
                        </h3>

                        {product.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {product.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-blue-600">
                            {formatPrice(product.price)}
                          </span>

                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </div>
        ))}

      </div>

      {/* Modal produto */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg rounded-t-xl sm:rounded-xl max-h-[90vh] overflow-y-auto">

            <div className="relative">
              {viewingProduct.image_url && (
  <div className="relative w-full max-h-[60vh] overflow-hidden bg-black">
    <img
      src={viewingProduct.image_url}
      alt={viewingProduct.name}
      className="w-full h-auto max-h-[60vh] object-contain mx-auto"
    />
  </div>
)}

              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 bg-white/80"
                onClick={closeProductModal}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-4">

              <div>
                <h3 className="text-xl font-bold">
                  {viewingProduct.name}
                </h3>

                {viewingProduct.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {viewingProduct.description}
                  </p>
                )}
              </div>

              <div className="text-lg font-bold text-blue-600">
                {formatPrice(viewingProduct.price)}
              </div>

              {viewingProduct.adicionais && viewingProduct.adicionais.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">
                    Adicionais
                  </h4>

                  <div className="space-y-2">
                    {viewingProduct.adicionais.map(add => {
                      const key = add.id || add.name

                      return (
                        <label
                          key={key}
                          className="flex items-center justify-between border rounded p-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!selectedAdditionais[key]}
                              onChange={() => handleAdditionalToggle(key)}
                            />

                            <span className="text-sm">
                              {add.name}
                            </span>
                          </div>

                          <span className="text-sm font-medium">
                            + {formatPrice(add.price)}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

          <div className="flex items-center gap-3">

  <Button
    size="icon"
    variant="outline"
    onClick={() => setQuantity(q => Math.max(1, q - 1))}
  >
    <Minus className="w-4 h-4" />
  </Button>

<input
  type="number"
  min={1}
  inputMode="numeric"
  value={quantity === 0 ? '' : quantity}
  onFocus={() => {
    if (quantity === 1) setQuantity(0)
  }}
  onChange={(e) => {
    const v = e.target.value

    if (v === '') {
      setQuantity(0)
      return
    }

    const n = Number(v)
    if (!isNaN(n)) setQuantity(n)
  }}
  onBlur={() => {
    if (!quantity || quantity < 1) setQuantity(1)
  }}
  className="w-20 h-9 text-center border rounded-md text-sm"
/>


  <Button
    size="icon"
    variant="outline"
    onClick={() => setQuantity(q => q + 1)}
  >
    <Plus className="w-4 h-4" />
  </Button>

</div>


              <Button
                className="w-full"
                onClick={addToCartWithAdditionais}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar ao orçamento
              </Button>

            </div>
          </div>
        </div>
      )}

      {/* Botão carrinho flutuante */}
      {cartItemCount > 0 && (
        <Button
          className="fixed bottom-6 right-6 rounded-full shadow-lg z-40"
          size="icon"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1">
            {cartItemCount}
          </span>
        </Button>
      )}

      {/* Carrinho */}
      {isCartOpen && (
  <div
    className="fixed inset-0 z-50"
    onClick={() => setIsCartOpen(false)}
  >
    {/* overlay */}
    <div className="absolute inset-0 bg-black/40" />

    {/* container responsivo */}
    <div
      className="
        fixed
        bottom-0
        left-0
        right-0
        h-[92vh]
        bg-white
        rounded-t-2xl
        shadow-2xl
        flex
        flex-col
        sm:top-0
        sm:bottom-auto
        sm:left-auto
        sm:right-0
        sm:h-full
        sm:w-full
        sm:max-w-sm
        sm:rounded-none
      "
      onClick={(e) => e.stopPropagation()}
    >

      {/* handle */}
      <div className="w-full py-2 flex justify-center sm:hidden">
        <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
      </div>

      {/* header */}
      <div className="px-4 pb-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-base">
          Seu orçamento
        </h3>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsCartOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* lista */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">

        {cart.length === 0 && (
          <p className="text-sm text-gray-500 text-center">
            Seu orçamento está vazio.
          </p>
        )}

        {cart.map((item, index) => {

          const addsTotal =
            item.selectedAdditionais?.reduce((s, a) => s + a.price, 0) || 0

          return (
            <div
              key={index}
              className="rounded-xl border p-3 space-y-2 bg-white"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.name}
                  </p>

                  {item.selectedAdditionais?.length > 0 && (
                    <p className="text-xs text-gray-500 truncate">
                      {item.selectedAdditionais.map(a => a.name).join(', ')}
                    </p>
                  )}
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between">

                {/* quantidade editável */}
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() =>
                      updateQuantity(item.id, Math.max(1, item.quantity - 1))
                    }
                  >
                    <Minus className="w-3 h-3" />
                  </Button>

                <input
  type="number"
  min={1}
  inputMode="numeric"
  value={item.quantity === 0 ? '' : item.quantity}
  onFocus={() => {
    if (item.quantity === 1) {
      updateQuantity(item.id, 0)
    }
  }}
  onChange={(e) => {
    const v = e.target.value

    if (v === '') {
      updateQuantity(item.id, 0)
      return
    }

    const n = Number(v)
    if (!isNaN(n)) {
      updateQuantity(item.id, n)
    }
  }}
  onBlur={() => {
    if (!item.quantity || item.quantity < 1) {
      updateQuantity(item.id, 1)
    }
  }}
  className="w-12 h-7 text-center border rounded-md text-xs"
/>


                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() =>
                      updateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <span className="text-sm font-semibold">
                  {formatPrice((item.price + addsTotal) * item.quantity)}
                </span>

              </div>
            </div>
          )
        })}

      </div>

      {/* footer */}
      <div className="p-4 border-t space-y-3">

        <div className="flex justify-between font-semibold text-sm">
          <span>Total</span>
          <span>{formatPrice(cartTotal)}</span>
        </div>

        <Button
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => {
            const text = cart.map(item => {
              const adds =
                item.selectedAdditionais?.length
                  ? ` (Adicionais: ${item.selectedAdditionais.map(a => a.name).join(', ')})`
                  : ''

              return `- ${item.quantity}x ${item.name}${adds} — ${formatPrice(
                item.price +
                  (item.selectedAdditionais?.reduce((s, a) => s + a.price, 0) || 0)
              )}`
            }).join('\n')

            const message = `Olá! Gostaria de fazer um orçamento:\n\n${text}\n\nTotal: ${formatPrice(cartTotal)}`

            const phone = bakerySettings.phone?.replace(/\D/g, '')
            const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`
            window.open(url, '_blank')
          }}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Enviar pelo WhatsApp
        </Button>

      </div>

    </div>
  </div>
)}


      {/* Footer */}
      <footer className="mt-10 py-6 text-center text-xs text-gray-400">
        Catálogo gerado com Confeitaria Pro
      </footer>

    </div>
  )
}

export default CatalogoPublico
