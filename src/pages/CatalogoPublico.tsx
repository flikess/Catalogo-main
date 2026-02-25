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
  ArrowRight,
  AlertTriangle,
  Eye,
  X,
  LayoutGrid,
  List,
  Star
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
  image_urls?: string[]
  categoria_id?: string
  categorias_produtos?: any
  adicionais?: Additional[]
  is_featured?: boolean
  sizes?: {
    name: string
    price: number
  }[]
  variations?: {
    name: string
    options: {
      name: string
      price: number
    }[]
  }[]
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
  banner_mobile_url?: string
  presentation_message?: string
}

interface CartItem extends Product {
  quantity: number
  selectedAdditionais: Additional[]
  selectedSize?: {
    name: string
    price: number
  } | null
  selectedVariations?: {
    group: string
    name: string
    price: number
  }[]
}



type ViewMode = 'grid' | 'list'

const CatalogoPublico = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [bakerySettings, setBakerySettings] = useState<BakerySettings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [selectedAdditionais, setSelectedAdditionais] = useState<Record<string, boolean>>({})
  const [selectedVariations, setSelectedVariations] = useState<
    Record<string, { name: string; price: number }>
  >({})
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<{
    name: string
    price: number
  } | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const hasSizes = (p?: Product | null) =>
    Array.isArray(p?.sizes) && p.sizes.length > 0

  const getBasePrice = (p: Product) => {
    if (hasSizes(p)) return null
    return p.price
  }


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
  id, name, description, price, image_url, image_urls, categoria_id, adicionais, is_featured, sizes, variations,
  categorias_produtos (
    nome
  )
`)
        .eq('user_id', userId)
        .eq('show_in_catalog', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (productsError) throw productsError

      const featured = (productsData || []).filter(p => p.is_featured)
      setFeaturedProducts(featured)

      const groupedProducts: { [key: string]: Category } = {}

      productsData
        ?.filter(p => !p.is_featured)
        .forEach(product => {
          const categoryData = Array.isArray(product.categorias_produtos)
            ? product.categorias_produtos[0]
            : product.categorias_produtos
          const categoryName = categoryData?.nome || 'Outros'
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
    setSelectedSize(null)
    setSelectedVariations({})
    setCurrentImageIndex(0)
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
    if (viewingProduct.variations?.length) {
      const notSelected = viewingProduct.variations.find(
        g => !selectedVariations[g.name]
      )

      if (notSelected) {
        alert(`Selecione: ${notSelected.name}`)
        return
      }
    }


    const selectedAdds =
      viewingProduct.adicionais?.filter(add =>
        selectedAdditionais[add.id || add.name]
      ) || []

    const variationsTotal = Object.values(selectedVariations)
      .reduce((s, v) => s + (v?.price || 0), 0)

    let basePrice = viewingProduct.price || 0

    if (hasSizes(viewingProduct)) {

      // só obriga escolher tamanho se existir algum tamanho com preço > 0
      const hasPaidSize =
        viewingProduct.sizes?.some(s => Number(s.price) > 0)

      if (hasPaidSize && !selectedSize) {
        alert('Selecione um tamanho.')
        return
      }

      if (selectedSize && Number(selectedSize.price) > 0) {
        basePrice = Number(selectedSize.price)
      }
    }

    let finalPrice = basePrice + variationsTotal


    setCart(prevCart => {
      const itemKey = `${viewingProduct.id}-${selectedSize?.name || 'nosize'}-${JSON.stringify(selectedAdds)}-${JSON.stringify(selectedVariations)}`

      const existingIndex = prevCart.findIndex(item => {

        const key =
          `${item.id}-${item.selectedSize?.name || 'nosize'}`
          + `-${JSON.stringify(item.selectedAdditionais)}`
          + `-${JSON.stringify(item.selectedVariations)}`

        return key === itemKey
      })


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
          selectedSize,
          quantity,
          selectedAdditionais: selectedAdds,
          selectedVariations: Object.entries(selectedVariations).map(
            ([group, opt]) => ({
              group,
              name: opt.name,
              price: opt.price
            })
          )
        }


      ]

    })

    showSuccess(`${viewingProduct.name} adicionado ao orçamento!`)
    recordCartAdd(viewingProduct.id)
    closeProductModal()
  }

  const updateQuantity = (index: number, newQuantity: number) => {
    setCart(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index))
  }


  const cartTotal = cart.reduce((sum, item) => {

    const additionaisTotal =
      item.selectedAdditionais?.reduce((addSum, add) => addSum + add.price, 0) || 0

    const variationsTotal =
      item.selectedVariations?.reduce((s, v) => s + v.price, 0) || 0

    const basePrice =
      item.selectedSize && Number(item.selectedSize.price) > 0
        ? Number(item.selectedSize.price)
        : item.price

    const unit =
      basePrice + additionaisTotal + variationsTotal

    return sum + unit * item.quantity

  }, 0)



  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const getItemPreviewTotal = () => {
    if (!viewingProduct) return 0

    let basePrice = viewingProduct.price || 0

    if (hasSizes(viewingProduct)) {
      if (selectedSize && Number(selectedSize.price) > 0) {
        basePrice = Number(selectedSize.price)
      }
    }

    const additionaisTotal =
      viewingProduct.adicionais?.reduce((sum, add) => {
        const key = add.id || add.name
        return selectedAdditionais[key]
          ? sum + add.price
          : sum
      }, 0) || 0

    const variationsTotal =
      Object.values(selectedVariations || {}).reduce(
        (s, v) => s + (v?.price || 0),
        0
      )

    return (basePrice + additionaisTotal + variationsTotal) * quantity
  }



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
      <div className="relative">

        {(bakerySettings.banner_url || bakerySettings.banner_mobile_url) ? (

          <div className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] overflow-hidden">

            <picture>
              {/* desktop */}
              {bakerySettings.banner_url && (
                <source
                  media="(min-width: 640px)"
                  srcSet={bakerySettings.banner_url}
                />
              )}

              {/* mobile (fallback) */}
              <img
                src={
                  bakerySettings.banner_mobile_url ||
                  bakerySettings.banner_url ||
                  ''
                }
                alt="Banner"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center' }}
              />
            </picture>

            {/* overlay */}
            <div className="absolute inset-0 bg-black/40" />

          </div>

        ) : (
          <div className="w-full h-[220px] sm:h-[360px] md:h-[420px] bg-white shadow-sm" />
        )}

        {/* Conteúdo */}
        <div className="absolute inset-0 flex items-center justify-start sm:justify-center pt-4 sm:pt-6">

          <div
            className={`max-w-6xl mx-auto px-4 text-center
        ${(bakerySettings.banner_url || bakerySettings.banner_mobile_url)
                ? 'text-white'
                : 'text-gray-900'}
      `}
          >

            {bakerySettings.logo_url && (
              <div className="mb-3 flex justify-center">
                <img
                  src={bakerySettings.logo_url}
                  alt="Logo"
                  className="w-20 h-20 sm:w-28 sm:h-28 object-cover rounded-full border-4 border-white shadow-lg bg-white"
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-bold mb-1">
              {bakerySettings.bakery_name || 'Loja'}
            </h1>

            {bakerySettings.presentation_message && (
              <p
                className={`text-xs sm:text-sm italic max-w-2xl mx-auto mb-3
            ${(bakerySettings.banner_url || bakerySettings.banner_mobile_url)
                    ? 'opacity-90'
                    : 'text-gray-600'}
          `}
              >
                {bakerySettings.presentation_message}
              </p>
            )}

            <div
              className={`flex flex-wrap justify-center gap-3 text-xs sm:text-sm
          ${(bakerySettings.banner_url || bakerySettings.banner_mobile_url)
                  ? 'opacity-95'
                  : 'text-gray-600'}
        `}
            >
              {bakerySettings.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{bakerySettings.phone}</span>
                </div>
              )}

              {bakerySettings.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{bakerySettings.email}</span>
                </div>
              )}

              {getFullAddress() && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{getFullAddress()}</span>
                </div>
              )}
            </div>

            <div className="mt-3">
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

        {featuredProducts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Produtos em destaque
            </h2>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {featuredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow border-yellow-300"
                    onClick={() => openProductModal(product)}
                  >
                    <CardContent className="p-3 flex flex-col h-full">
                      <div className="relative mb-2">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-32 object-cover rounded"
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
                          {hasSizes(product)
                            ? 'A partir de ' +
                            formatPrice(
                              Math.min(...product.sizes!.map(s => s.price))
                            )
                            : formatPrice(product.price!)
                          }
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
                {featuredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-yellow-300"
                    onClick={() => openProductModal(product)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      <div className="w-20 h-20 shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover rounded"
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
        )}

        {categories.map(category => (
          <div
            key={category.id}
            ref={el => { categoryRefs.current[category.id] = el }}
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

            <div className="relative bg-black h-[60vh] flex items-center justify-center">
              {(viewingProduct.image_urls && viewingProduct.image_urls.length > 0) ? (
                <div className="relative w-full h-full">
                  <img
                    src={viewingProduct.image_urls[currentImageIndex]}
                    alt={viewingProduct.name}
                    className="w-full h-full object-contain mx-auto"
                  />

                  {viewingProduct.image_urls.length > 1 && (
                    <>
                      <button
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => (prev === 0 ? viewingProduct.image_urls!.length - 1 : prev - 1));
                        }}
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(prev => (prev === viewingProduct.image_urls!.length - 1 ? 0 : prev + 1));
                        }}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>

                      {/* Dots */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {viewingProduct.image_urls.map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : viewingProduct.image_url ? (
                <img
                  src={viewingProduct.image_url}
                  alt={viewingProduct.name}
                  className="w-full h-full object-contain mx-auto"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                  <ImageIcon className="w-12 h-12 mb-2" />
                  <span className="text-sm">Sem imagem</span>
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

              {!hasSizes(viewingProduct) && (
                <div className="text-lg font-bold text-blue-600">
                  {formatPrice(viewingProduct.price!)}
                </div>
              )}
              {hasSizes(viewingProduct) && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">
                    Tamanho
                  </h4>

                  <div className="grid grid-cols-3 gap-2">
                    {viewingProduct.sizes!.map((s, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        className={`
    border rounded-md px-3 py-2 text-sm
    flex flex-col items-center justify-center
    transition
    ${selectedSize?.name === s.name
                            ? 'border-blue-600 bg-blue-600 text-white ring-2 ring-blue-300'
                            : 'border-gray-300 bg-white hover:bg-gray-50'
                          }
  `}
                      >
                        <div className="text-sm font-semibold">
                          {s.name || 'Tamanho'}
                        </div>

                        {Number(s.price) > 0 && (
                          <div
                            className={`text-xs ${selectedSize?.name === s.name
                              ? 'text-white/90'
                              : 'text-gray-500'
                              }`}
                          >
                            {formatPrice(Number(s.price))}
                          </div>
                        )}

                      </button>

                    ))}
                  </div>
                </div>
              )}

              {viewingProduct.variations && viewingProduct.variations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">
                    Opções
                  </h4>

                  {viewingProduct.variations.map((group, gIndex) => (
                    <div key={gIndex} className="space-y-2">
                      <p className="text-sm font-medium">
                        {group.name}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {group.options.map((opt, oIndex) => {
                          const key = `${group.name}-${opt.name}`

                          const selected =
                            selectedVariations[group.name]?.name === opt.name

                          return (
                            <button
                              key={oIndex}
                              type="button"
                              onClick={() =>
                                setSelectedVariations(prev => ({
                                  ...prev,
                                  [group.name]: opt
                                }))
                              }
                              className={`
                  border rounded-md px-3 py-1.5 text-sm
                  transition
                  ${selected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-gray-300 bg-white hover:bg-gray-50'
                                }
                `}
                            >
                              {opt.name}
                              {opt.price > 0 && (
                                <span className="ml-1 text-xs opacity-80">
                                  (+{formatPrice(opt.price)})
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}


              {viewingProduct.adicionais && viewingProduct.adicionais.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">
                    Adicionais
                  </h4>

                  <div className="space-y-2">
                    {viewingProduct.adicionais.map(add => {
                      const key = add.id || add.name

                      return (
                        <div
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
                        </div>
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
              <div className="flex justify-between items-center border-t pt-3">
                <span className="text-sm textq text-gray-600">
                  Total deste item
                </span>

                <span className="text-lg font-bold text-blue-600">
                  {getItemPreviewTotal() > 0
                    ? formatPrice(getItemPreviewTotal())
                    : 'Selecione as opções'}
                </span>
              </div>



              <Button
                className="w-full"
                disabled={
                  (
                    viewingProduct.sizes?.some(s => Number(s.price) > 0) &&
                    !selectedSize
                  )
                  ||
                  (viewingProduct.variations?.some(v => !selectedVariations[v.name]))
                }

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

                const variationsTotal =
                  item.selectedVariations?.reduce((s, v) => s + v.price, 0) || 0

                const sizePrice = item.selectedSize?.price || 0


                return (
                  <div
                    key={index}
                    className="rounded-xl border p-3 space-y-2 bg-white"
                  >
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">

                        <p className="text-sm font-medium truncate">
                          {item.name}
                          {item.selectedSize && (
                            <span className="text-xs text-gray-500">
                              {' '}({item.selectedSize.name})
                            </span>
                          )}
                        </p>

                        {item.selectedAdditionais?.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.selectedAdditionais.map(a => a.name).join(', ')}
                          </p>
                        )}
                        {item.selectedVariations?.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.selectedVariations
                              .map(v => `${v.group}: ${v.name}`)
                              .join(', ')}
                          </p>
                        )}

                      </div>


                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFromCart(index)}
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
                            updateQuantity(index, Math.max(1, item.quantity - 1))
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
                              updateQuantity(index, 0)
                            }
                          }}
                          onChange={(e) => {
                            const v = e.target.value

                            if (v === '') {
                              updateQuantity(index, 0)
                              return
                            }

                            const n = Number(v)
                            if (!isNaN(n)) {
                              updateQuantity(index, n)
                            }
                          }}
                          onBlur={() => {
                            if (!item.quantity || item.quantity < 1) {
                              updateQuantity(index, 1)
                            }
                          }}
                          className="w-12 h-7 text-center border rounded-md text-xs"
                        />


                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() =>
                            updateQuantity(index, item.quantity + 1)
                          }
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      <span className="text-sm font-semibold">
                        {formatPrice(
                          (
                            (
                              item.selectedSize && Number(item.selectedSize.price) > 0
                                ? Number(item.selectedSize.price)
                                : item.price
                            )
                            + addsTotal
                            + variationsTotal
                          ) * item.quantity
                        )}


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
                className="w-full"
                onClick={() =>
                  navigate('/finalizar', {
                    state: {
                      cart,
                      cartTotal,
                      bakerySettings
                    }
                  })
                }
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Finalizar pedido
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
