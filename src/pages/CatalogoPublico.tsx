import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Star,
  Search,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Store
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'
import { getBusinessConfig } from '@/utils/business-types'

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
  categorias_produtos?: {
    nome: string
    banner_desktop_url?: string
    banner_mobile_url?: string
  }
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
  sub_categoria_id?: string
  subcategorias_produtos?: {
    nome: string
  }
}

interface Subcategory {
  id: string
  nome: string
  categoria_id: string
}


interface Category {
  id: string
  nome: string
  banner_desktop_url?: string
  banner_mobile_url?: string
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
  vende_cnpj?: boolean
  business_type?: string
  working_hours?: Record<number, { open: string; close: string; closed: boolean }>
}

interface Client {
  id: string
  name: string
  cnpj: string
  discount_percentage?: number
  markup_percentage?: number
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
  const { identifier, userId: oldUserId } = useParams<{ identifier: string, userId: string }>()
  const idValue = identifier || oldUserId // Mantém compatibilidade com /catalogo/:userId
  const navigate = useNavigate()

  const [realUserId, setRealUserId] = useState<string | null>(null)

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
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('all')
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none')
  const [allSubcategories, setAllSubcategories] = useState<Subcategory[]>([])

  const [cnpjClient, setCnpjClient] = useState<Client | null>(null)
  const [showCnpjLogin, setShowCnpjLogin] = useState(false)
  const [loginCnpjInput, setLoginCnpjInput] = useState('')
  const [loginError, setLoginError] = useState('')

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const hasSizes = (p?: Product | null) =>
    Array.isArray(p?.sizes) && p.sizes.length > 0

  const maskCNPJ = (value: string) => {
    const rawValue = value.replace(/\D/g, '').slice(0, 14)
    return rawValue
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  const getAdjustedPrice = (price: number) => {
    if (!cnpjClient) return price
    let adjusted = price
    if (cnpjClient.discount_percentage) {
      adjusted -= (price * cnpjClient.discount_percentage) / 100
    }
    if (cnpjClient.markup_percentage) {
      adjusted += (price * cnpjClient.markup_percentage) / 100
    }
    return adjusted
  }

  const formatPrice = (price: number, shouldAdjust = true) => {
    const finalPrice = shouldAdjust ? getAdjustedPrice(price) : price
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(finalPrice)
  }

  const getBasePrice = (p: Product) => {
    if (hasSizes(p)) return null
    return p.price
  }

  const isStoreOpen = () => {
    if (!bakerySettings.working_hours) return true

    // Usar o horário do sistema (o USER mandou o horário atual)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const hours = bakerySettings.working_hours[dayOfWeek]

    if (!hours || hours.closed) return false

    const [openH, openM] = hours.open.split(':').map(Number)
    const [closeH, closeM] = hours.close.split(':').map(Number)

    const nowH = now.getHours()
    const nowM = now.getMinutes()

    const nowInMinutes = nowH * 60 + nowM
    const openInMinutes = openH * 60 + openM
    const closeInMinutes = closeH * 60 + closeM

    return nowInMinutes >= openInMinutes && nowInMinutes <= closeInMinutes
  }

  const storeIsOpen = isStoreOpen()


  useEffect(() => {
    if (idValue) {
      fetchCatalogData()
    } else {
      setError('ID do catálogo não fornecido.')
      setLoading(false)
    }
  }, [idValue])

  useEffect(() => {
    if (realUserId) {
      recordCatalogView()
    }
  }, [realUserId])

  const recordCatalogView = async () => {
    if (!realUserId) return
    try {
      await supabase.from('catalog_views').insert({ user_id: realUserId })
    } catch (err) {
      console.error('Failed to record catalog view:', err)
    }
  }

  const recordCartAdd = async (productId: string) => {
    if (!realUserId) return
    try {
      await supabase.from('cart_adds').insert({ user_id: realUserId, product_id: productId })
    } catch (err) {
      console.error('Failed to record cart add:', err)
    }
  }

  const fetchCatalogData = async () => {
    try {
      setLoading(true)
      setError(null)

      let settingsData = null
      let settingsError = null

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idValue || '')

      if (isUuid) {
        const { data, error } = await supabase
          .from('bakery_settings')
          .select('*')
          .eq('id', idValue)
          .single()
        settingsData = data
        settingsError = error
      } else {
        const { data, error } = await supabase
          .from('bakery_settings')
          .select('*')
          .eq('catalog_slug', idValue)
          .single()
        settingsData = data
        settingsError = error
      }

      if (settingsError) {
        if (settingsError.code === 'PGRST116') {
          setError('Catálogo não encontrado.')
        } else {
          console.error('Error fetching settings:', settingsError)
          setError('Erro ao carregar catálogo.')
        }
        setLoading(false)
        return
      }

      const activeUserId = settingsData.id
      setRealUserId(activeUserId)
      setBakerySettings(settingsData || {})

      if (settingsData.vende_cnpj && !cnpjClient) {
        setShowCnpjLogin(true)
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
  id, name, description, price, image_url, image_urls, categoria_id, sub_categoria_id, adicionais, is_featured, sizes, variations,
  categorias_produtos (
    nome, banner_desktop_url, banner_mobile_url
  ),
  subcategorias_produtos (
    nome
  )
`)
        .eq('user_id', activeUserId)
        .eq('show_in_catalog', true)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (productsError) throw productsError

      const formattedProducts = (productsData || []).map(p => ({
        ...p,
        categorias_produtos: Array.isArray(p.categorias_produtos) ? p.categorias_produtos[0] : p.categorias_produtos,
        subcategorias_produtos: Array.isArray(p.subcategorias_produtos) ? p.subcategorias_produtos[0] : p.subcategorias_produtos
      }))

      const featured = formattedProducts.filter(p => p.is_featured)
      setFeaturedProducts(featured)

      // Buscar subcategorias do usuário
      const { data: subsData } = await supabase
        .from('subcategorias_produtos')
        .select('id, nome, categoria_id')
        .eq('user_id', activeUserId)

      setAllSubcategories(subsData || [])

      const groupedProducts: { [key: string]: Category } = {}

      formattedProducts
        ?.filter(p => !p.is_featured)
        .forEach(product => {
          const categoryName = product.categorias_produtos?.nome || 'Outros'
          const categoryId = product.categoria_id || 'outros'
          const bannerDesktop = product.categorias_produtos?.banner_desktop_url
          const bannerMobile = product.categorias_produtos?.banner_mobile_url

          if (!groupedProducts[categoryId]) {
            groupedProducts[categoryId] = {
              id: categoryId,
              nome: categoryName,
              banner_desktop_url: bannerDesktop,
              banner_mobile_url: bannerMobile,
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
    setSelectedCategoryId(categoryId)
    setSelectedSubCategoryId('all')
    if (categoryId !== 'all') {
      setTimeout(() => {
        const element = categoryRefs.current[categoryId]
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const getFilteredCategories = () => {
    return categories
      .map(cat => {
        // Se uma categoria específica for selecionada, apenas processa ela
        if (selectedCategoryId !== 'all' && cat.id !== selectedCategoryId) {
          return null
        }

        let filteredProducts = cat.products.filter(p => {
          const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
          const matchesSub = selectedSubCategoryId === 'all' || p.sub_categoria_id === selectedSubCategoryId
          return matchesSearch && matchesSub
        })

        if (priceSort === 'asc') {
          filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price)
        } else if (priceSort === 'desc') {
          filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price)
        }

        if (filteredProducts.length === 0 && (searchTerm || selectedSubCategoryId !== 'all' || selectedCategoryId !== 'all')) {
          return null
        }

        return {
          ...cat,
          products: filteredProducts
        }
      })
      .filter((cat): cat is Category => cat !== null)
  }

  const displayCategories = getFilteredCategories()

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

    if (!storeIsOpen) {
      alert('A loja está fechada no momento. Por favor, tente novamente durante o horário de funcionamento.')
      return
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
      getAdjustedPrice(basePrice + additionaisTotal + variationsTotal)

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

    return getAdjustedPrice(basePrice + additionaisTotal + variationsTotal) * quantity
  }




  const businessConfig = getBusinessConfig(bakerySettings.business_type)

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

  const handleSendToWhatsApp = async () => {
    if (cart.length === 0) return

    if (!storeIsOpen) {
      showError('A loja está fechada no momento. Os pedidos não podem ser processados.')
      return
    }

    try {
      // 1. Salvar o pedido no banco de dados primeiro
      const orderData = {
        client_id: cnpjClient?.id || null,
        client_name: cnpjClient?.name || 'Cliente Visitante',
        total_amount: cartTotal,
        discount_percentage: cnpjClient?.discount_percentage || 0,
        delivery_fee: 0,
        status: 'orcamento',
        user_id: realUserId,
        notes: cnpjClient ? `Pedido enviado via Catálogo CNPJ (CNPJ: ${cnpjClient.cnpj})` : 'Pedido enviado via Catálogo Público',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Salvar os itens do pedido
      const orderItemsData = cart.map(item => {
        const addsTotal = item.selectedAdditionais?.reduce((s, a) => s + a.price, 0) || 0
        const variationsTotal = item.selectedVariations?.reduce((s, v) => s + v.price, 0) || 0
        const basePrice = item.selectedSize && Number(item.selectedSize.price) > 0 ? Number(item.selectedSize.price) : item.price
        const unitPriceAdjusted = getAdjustedPrice(basePrice + addsTotal + variationsTotal)

        return {
          order_id: newOrder.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: unitPriceAdjusted,
          total_price: unitPriceAdjusted * item.quantity,
          adicionais: item.selectedAdditionais,
          size: item.selectedSize,
          variations: item.selectedVariations
        }
      })

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      // 3. Montar a mensagem do WhatsApp
      let message = `*Pedido #${newOrder.id.slice(0, 8)} - ${bakerySettings.bakery_name}*\n\n`

      if (cnpjClient) {
        message += `*Cliente:* ${cnpjClient.name}\n`
        message += `*CNPJ:* ${cnpjClient.cnpj}\n\n`
      }

      cart.forEach(item => {
        const addsTotal = item.selectedAdditionais?.reduce((s, a) => s + a.price, 0) || 0
        const variationsTotal = item.selectedVariations?.reduce((s, v) => s + v.price, 0) || 0
        const basePrice = item.selectedSize && Number(item.selectedSize.price) > 0 ? Number(item.selectedSize.price) : item.price
        const unitPrice = getAdjustedPrice(basePrice + addsTotal + variationsTotal)

        message += `*${item.quantity}x ${item.name}*\n`
        if (item.selectedSize) message += `Tamanho: ${item.selectedSize.name}\n`
        if (item.selectedVariations?.length) {
          item.selectedVariations.forEach(v => {
            message += `${v.group}: ${v.name}\n`
          })
        }
        if (item.selectedAdditionais?.length) {
          message += `Adicionais: ${item.selectedAdditionais.map(a => a.name).join(', ')}\n`
        }
        message += `Subtotal: ${formatPrice(unitPrice * item.quantity, false)}\n\n`
      })

      message += `*Total: ${formatPrice(cartTotal, false)}*`

      const encodedMessage = encodeURIComponent(message)
      const phone = bakerySettings.phone?.replace(/\D/g, '')

      if (phone) {
        window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank')
      } else {
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
      }

      // Limpar carrinho após sucesso
      setCart([])
      setIsCartOpen(false)
      showSuccess('Pedido registrado com sucesso!')

    } catch (error) {
      console.error('Erro ao registrar pedido no banco:', error)

      // FALLBACK: Se falhar no banco, ainda tentamos enviar o WhatsApp 
      // para não perder a venda do cliente visitante.
      try {
        let message = `*Pedido (Visitante) - ${bakerySettings.bakery_name}*\n\n`

        cart.forEach(item => {
          const addsTotal = item.selectedAdditionais?.reduce((s, a) => s + a.price, 0) || 0
          const variationsTotal = item.selectedVariations?.reduce((s, v) => s + v.price, 0) || 0
          const basePrice = item.selectedSize && Number(item.selectedSize.price) > 0 ? Number(item.selectedSize.price) : item.price
          const unitPrice = getAdjustedPrice(basePrice + addsTotal + variationsTotal)

          message += `*${item.quantity}x ${item.name}*\n`
          if (item.selectedSize) message += `Tamanho: ${item.selectedSize.name}\n`
          if (item.selectedVariations?.length) {
            item.selectedVariations.forEach(v => {
              message += `${v.group}: ${v.name}\n`
            })
          }
          if (item.selectedAdditionais?.length) {
            message += `Adicionais: ${item.selectedAdditionais.map(a => a.name).join(', ')}\n`
          }
          message += `Subtotal: ${formatPrice(unitPrice * item.quantity, false)}\n\n`
        })

        message += `*Total: ${formatPrice(cartTotal, false)}*`
        const encodedMessage = encodeURIComponent(message)
        const phone = bakerySettings.phone?.replace(/\D/g, '')

        if (phone) {
          window.open(`https://wa.me/55${phone}?text=${encodedMessage}`, '_blank')
        } else {
          window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
        }

        setCart([])
        setIsCartOpen(false)
        showSuccess('Pedido enviado pelo WhatsApp!')
      } catch (err) {
        showError('Erro ao gerar link do WhatsApp. Tente novamente.')
      }
    }
  }

  const handleCnpjLogin = async () => {
    if (!loginCnpjInput) return
    setLoginError('')

    const cleanInput = loginCnpjInput.trim()
    const rawCnpj = cleanInput.replace(/\D/g, '')
    const maskedCnpj = maskCNPJ(cleanInput)

    console.log('🔍 Tentando login CNPJ:', {
      input: cleanInput,
      raw: rawCnpj,
      masked: maskedCnpj,
      lojaId: realUserId
    })

    try {
      // Busca mais flexível usando ilike e buscando tanto o formato limpo quanto o mascarado
      // Também garante que o cliente pertença à loja correta (realUserId)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', realUserId)
        .or(`cnpj.ilike.%${rawCnpj}%,cnpj.ilike.%${maskedCnpj}%`)
        .maybeSingle()

      if (error) {
        console.error('❌ Erro Supabase CNPJ:', error)
        setLoginError('Erro técnico ao validar. Tente novamente.')
        return
      }

      if (!data) {
        console.warn('⚠️ Nenhum cliente encontrado para este CNPJ nesta loja.')
        setLoginError('CNPJ não cadastrado ou pertence a outra loja.')
        return
      }

      console.log('✅ Cliente autenticado:', data.name)
      setCnpjClient(data)
      setShowCnpjLogin(false)
      showSuccess(`Bem-vindo, ${data.name}!`)
    } catch (err) {
      console.error('💥 Erro fatal no login CNPJ:', err)
      setLoginError('Ocorreu um erro inesperado.')
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

  if (showCnpjLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
        <Card className="max-w-md w-full p-8 shadow-2xl border-none bg-white/80 backdrop-blur-lg">
          <div className="text-center space-y-2 mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
              <Store className="w-8 h-8 text-white -rotate-3" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Bem-vindo(a)</h1>
            <p className="text-sm text-gray-500">Digite seu CNPJ para acessar preços e condições exclusivas de {bakerySettings.bakery_name}.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="cnpj-login" className="text-xs font-semibold uppercase tracking-wider text-gray-500 ml-1">CNPJ da Empresa</Label>
              <Input
                id="cnpj-login"
                placeholder="00.000.000/0000-00"
                value={loginCnpjInput}
                onChange={(e) => setLoginCnpjInput(maskCNPJ(e.target.value))}
                className="h-12 border-gray-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl"
              />
              {loginError && <p className="text-sm font-medium text-red-500 animate-pulse ml-1">{loginError}</p>}
            </div>

            <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 text-base font-semibold" onClick={handleCnpjLogin}>
              Acessar Catálogo
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-400 font-medium">Não é parceiro?</span>
              </div>
            </div>

            <Button variant="ghost" className="w-full h-12 rounded-xl text-gray-600 hover:bg-gray-50 font-medium" onClick={() => setShowCnpjLogin(false)}>
              Continuar como visitante
            </Button>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-8">
            Sua privacidade é importante. Seus dados estão protegidos.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans">

      {/* Header */}
      <div className="relative">

        {!storeIsOpen && !loading && !error && (
          <div className="bg-orange-600 text-white text-center py-2.5 px-4 font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
            <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
            Loja fechada no momento. Os pedidos estão temporariamente suspensos.
          </div>
        )}

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




      {/* Filtros de Pesquisa */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 py-3 border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 space-y-3">

          {/* Busca por Texto */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar produtos..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Select value={selectedCategoryId} onValueChange={handleCategorySelect}>
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-full">
                  <SelectValue placeholder="Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSubCategoryId}
                onValueChange={setSelectedSubCategoryId}
                disabled={selectedCategoryId === 'all'}
              >
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-full">
                  <SelectValue placeholder="Sub-categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Sub</SelectItem>
                  {allSubcategories
                    .filter(sub => sub.categoria_id === selectedCategoryId)
                    .map(sub => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={priceSort} onValueChange={(v: any) => setPriceSort(v)}>
                <SelectTrigger className="w-[140px] h-9 text-xs rounded-full">
                  <div className="flex items-center gap-1">
                    {priceSort === 'asc' ? <ArrowUp className="w-3 h-3" /> : priceSort === 'desc' ? <ArrowDown className="w-3 h-3" /> : null}
                    <SelectValue placeholder="Ordenar preço" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Preço: Padrão</SelectItem>
                  <SelectItem value="asc">Preço: Menor</SelectItem>
                  <SelectItem value="desc">Preço: Maior</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-full">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-3 rounded-full text-xs"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-3 h-3 mr-1" />
                Grade
              </Button>

              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-3 rounded-full text-xs"
                onClick={() => setViewMode('list')}
              >
                <List className="w-3 h-3 mr-1" />
                Lista
              </Button>
            </div>
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

        {displayCategories.map(category => (
          <div
            key={category.id}
            ref={el => { categoryRefs.current[category.id] = el }}
            className="pt-4"
          >
            <div className="space-y-4 mb-6">
              {/* Banner da Categoria */}
              {category.banner_desktop_url && (
                <div className="hidden sm:block w-full h-[200px] md:h-[280px] rounded-2xl overflow-hidden mb-6 shadow-md border hover:shadow-lg transition-shadow">
                  <img
                    src={category.banner_desktop_url}
                    alt={category.nome}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {category.banner_mobile_url && (
                <div className="block sm:hidden w-full h-[140px] rounded-xl overflow-hidden mb-4 shadow-sm border">
                  <img
                    src={category.banner_mobile_url}
                    alt={category.nome}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-3">
                {category.nome}
              </h2>
            </div>

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
      {
        viewingProduct && (
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
                      {businessConfig.sizeLabel}
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
                      {businessConfig.variationLabel}
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
                      {businessConfig.additionalLabel}
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
                    !storeIsOpen ||
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
                  {storeIsOpen ? 'Adicionar ao orçamento' : 'Loja fechada'}
                </Button>

              </div>
            </div>
          </div>
        )
      }

      {/* Botão carrinho flutuante */}
      {
        cartItemCount > 0 && (
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
        )
      }

      {/* Carrinho */}
      {
        isCartOpen && (
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
                  <span>{formatPrice(cartTotal, false)}</span>
                </div>

                <Button
                  className="w-full"
                  disabled={!storeIsOpen || cart.length === 0}
                  onClick={() => {
                    if (bakerySettings.vende_cnpj) {
                      handleSendToWhatsApp()
                    } else {
                      navigate('/finalizar', {
                        state: {
                          cart,
                          cartTotal,
                          bakerySettings
                        }
                      })
                    }
                  }}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {!storeIsOpen ? 'Loja fechada' : (bakerySettings.vende_cnpj ? 'Enviar pelo WhatsApp' : 'Finalizar pedido')}
                </Button>


              </div>

            </div>
          </div>
        )
      }


      {/* Footer */}
      <footer className="mt-10 py-6 text-center text-xs text-gray-400">
        Catálogo gerado com Confeitaria Pro
      </footer>

    </div >
  )
}

export default CatalogoPublico
