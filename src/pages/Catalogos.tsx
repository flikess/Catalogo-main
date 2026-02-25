import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Eye, EyeOff, ExternalLink, Copy, MessageCircle, Image as ImageIcon, BarChart2, Calendar, Star, GripVertical } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showSuccess, showError } from '@/utils/toast'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  show_in_catalog: boolean
  is_featured: boolean
  image_url?: string
  created_at: string
  categoria_id?: string
  display_order?: number
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
  logo_url?: string
}

interface ViewStats {
  today: number
  week: number
  month: number
  total: number
}

interface TopProduct {
  id: string
  name: string
  image_url: string
  add_count: number
}

const Catalogos = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [bakerySettings, setBakerySettings] = useState<BakerySettings>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyVisible, setShowOnlyVisible] = useState(false)
  const [viewStats, setViewStats] = useState<ViewStats>({ today: 0, week: 0, month: 0, total: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchProducts()
    fetchBakerySettings()
    fetchStats()
  }, [])

  const fetchProducts = async () => {
    try {
      // Primeiro busca categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categorias_produtos')
        .select('id, nome')
        .eq('user_id', user?.id)
        .order('nome')

      if (categoriesError) throw categoriesError

      // Depois busca produtos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true })

      if (productsError) throw productsError

      const allProducts = productsData || []
      setProducts(allProducts)

      // Agrupar produtos por categorias
      const grouped: Category[] = (categoriesData || []).map(cat => ({
        ...cat,
        products: allProducts.filter(p => p.categoria_id === cat.id)
      }))

      // Adicionar categoria 'Outros' para produtos sem categoria
      const noCategoryProducts = allProducts.filter(p => !p.categoria_id)
      if (noCategoryProducts.length > 0) {
        grouped.push({
          id: 'outros',
          nome: 'Outros',
          products: noCategoryProducts
        })
      }

      setCategories(grouped)
    } catch (error) {
      console.error('Error fetching data:', error)
      showError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent, categoryId: string) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      let productsToUpdate: Product[] = []

      setCategories((prev) => {
        const categoryIndex = prev.findIndex(c => c.id === categoryId)
        if (categoryIndex === -1) return prev

        const newCategories = [...prev]
        const category = { ...newCategories[categoryIndex] }
        const oldIndex = category.products.findIndex(p => p.id === active.id)
        const newIndex = category.products.findIndex(p => p.id === over.id)

        category.products = arrayMove(category.products, oldIndex, newIndex)
        productsToUpdate = category.products
        newCategories[categoryIndex] = category
        return newCategories
      })

      if (productsToUpdate.length > 0) {
        try {
          // Usamos updates individuais para evitar problemas com colunas obrigatórias no upsert
          const updatePromises = productsToUpdate.map((p, index) =>
            supabase
              .from('products')
              .update({ display_order: index })
              .eq('id', p.id)
          )

          const results = await Promise.all(updatePromises)

          const firstError = results.find(r => r.error)?.error
          if (firstError) throw firstError

          showSuccess('Ordem salva!')
        } catch (error: any) {
          console.error('Error saving order:', error)
          showError(`Erro: ${error.message || 'Erro ao sincronizar ordem'}`)
        }
      }
    }
  }

  const SortableProductCard = ({ product }: { product: Product }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: product.id })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 50 : undefined,
      opacity: isDragging ? 0.5 : undefined,
    }

    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative overflow-hidden transition-all hover:shadow-md h-full flex flex-col",
          !product.show_in_catalog && "opacity-60",
          product.is_featured && "border-yellow-300 bg-yellow-50/30 shadow-sm"
        )}
      >
        <div className="aspect-square relative overflow-hidden bg-gray-100 flex-shrink-0">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}

          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 p-2 bg-white/95 backdrop-blur-sm rounded-md cursor-grab active:cursor-grabbing shadow-md z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="h-4 w-4 text-gray-700" />
          </div>

          <div className="absolute top-2 right-2 flex gap-1 z-10 transition-all duration-200">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
              onClick={() => toggleProductFeatured(product)}
            >
              <Star className={cn("h-4 w-4", product.is_featured ? "fill-yellow-400 text-yellow-400" : "text-gray-400")} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
              onClick={() => toggleProductVisibility(product)}
            >
              {product.show_in_catalog ? (
                <Eye className="h-4 w-4 text-blue-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
        </div>

        <CardContent className="p-3 flex-grow flex flex-col justify-between">
          <h4 className="font-semibold text-sm line-clamp-2 mb-1 min-h-[40px] leading-tight">{product.name}</h4>
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
            <span className="text-sm font-bold text-green-600">{formatPrice(product.price)}</span>
            <div className="flex gap-1">
              {!product.show_in_catalog && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-gray-50 text-gray-500 uppercase font-bold border-gray-200">Oculto</Badge>
              )}
              {product.is_featured && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-yellow-50 text-yellow-700 border-yellow-200 uppercase font-bold">Destaque</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CategorySection = ({ category }: { category: Category }) => {
    const filteredProductsInCategory = category.products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(p => !showOnlyVisible || p.show_in_catalog)

    if (filteredProductsInCategory.length === 0) return null

    return (
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {category.nome}
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs py-0">
              {filteredProductsInCategory.length} {filteredProductsInCategory.length === 1 ? 'item' : 'itens'}
            </Badge>
          </h3>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => handleDragEnd(e, category.id)}
        >
          <SortableContext
            items={filteredProductsInCategory.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredProductsInCategory.map((product) => (
                <SortableProductCard key={product.id} product={product} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    )
  }

  const fetchBakerySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('bakery_settings')
        .select('bakery_name, email, phone, logo_url')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setBakerySettings(data)
    } catch (error) {
      console.error('Error fetching bakery settings:', error)
    }
  }

  const fetchStats = async () => {
    if (!user) return
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString()
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 23)).toISOString() // 7 + 23 = 30

      const [
        todayRes,
        weekRes,
        monthRes,
        totalRes,
        topProductsRes
      ] = await Promise.all([
        supabase.from('catalog_views').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('viewed_at', today),
        supabase.from('catalog_views').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('viewed_at', sevenDaysAgo),
        supabase.from('catalog_views').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('viewed_at', thirtyDaysAgo),
        supabase.from('catalog_views').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.rpc('get_top_added_products', { user_uuid: user.id })
      ])

      setViewStats({
        today: todayRes.count || 0,
        week: weekRes.count || 0,
        month: monthRes.count || 0,
        total: totalRes.count || 0
      })

      if (topProductsRes.data) {
        setTopProducts(topProductsRes.data)
      }

    } catch (error) {
      console.error('Error fetching stats:', error)
      showError('Erro ao carregar estatísticas')
    }
  }

  const toggleProductVisibility = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          show_in_catalog: !product.show_in_catalog,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (error) throw error
      showSuccess(`Produto ${!product.show_in_catalog ? 'adicionado ao' : 'removido do'} catálogo!`)
      fetchProducts()
    } catch (error) {
      console.error('Error updating product visibility:', error)
      showError('Erro ao atualizar visibilidade do produto')
    }
  }

  const toggleProductFeatured = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          is_featured: !product.is_featured,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)

      if (error) throw error

      showSuccess(
        !product.is_featured
          ? 'Produto marcado como destaque!'
          : 'Produto removido dos destaques!'
      )

      fetchProducts()
    } catch (error) {
      console.error('Error updating featured product:', error)
      showError('Erro ao atualizar destaque do produto')
    }
  }

  const generateCatalogUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/catalogo/${user?.id}`
  }

  const copyLink = async () => {
    const url = generateCatalogUrl()
    try {
      await navigator.clipboard.writeText(url)
      showSuccess('Link copiado para a área de transferência!')
    } catch (error) {
      showError('Erro ao copiar link')
    }
  }

  const shareWhatsApp = () => {
    const url = generateCatalogUrl()
    const message = `🧁 Confira nosso catálogo de produtos!\n\n${bakerySettings.bakery_name || 'Nossa Loja'}\n\n${url}`
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank')
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesVisibility = !showOnlyVisible || product.show_in_catalog
    return matchesSearch && matchesVisibility
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const tableColumns = [
    {
      key: 'name',
      label: 'Produto',
      render: (value: string, row: Product) => (
        <div className="flex items-center space-x-3">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt={row.name}
              className="w-12 h-12 object-cover rounded-md flex-shrink-0"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium truncate">{value}</div>
            <p className="text-lg font-bold text-green-600">
              {formatPrice(row.price)}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'show_in_catalog',
      label: 'Visibilidade',
      render: (value: boolean, row: Product) => (
        <div className="flex flex-col items-center gap-2">
          <Badge
            className={value
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
            }
          >
            {value ? 'Visível' : 'Oculto'}
          </Badge>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleProductVisibility(row)}
              className="mt-2"
            >
              {value ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Mostrar
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              title="Marcar como destaque"
              onClick={() => toggleProductFeatured(row)}
              className={
                row.is_featured
                  ? 'mt-2 text-yellow-500 border-yellow-400'
                  : 'mt-2'
              }
            >
              <Star
                className={
                  row.is_featured
                    ? 'w-4 h-4 fill-yellow-400'
                    : 'w-4 h-4'
                }
              />
            </Button>
          </div>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
          <div className="flex flex-wrap gap-2">
            <Button onClick={shareWhatsApp} variant="outline" size="sm" className="bg-green-50 text-green-700 hover:bg-green-100">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              onClick={() => window.open(generateCatalogUrl(), '_blank')}
              size="sm"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
          </div>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Link do seu catálogo público</h3>
                <p className="text-sm text-blue-700 font-mono bg-white px-3 py-2 rounded border break-all">
                  {generateCatalogUrl()}
                </p>
              </div>
              <Button onClick={copyLink} size="sm" className="ml-auto sm:ml-4 flex-shrink-0">
                <Copy className="w-4 h-4 mr-2" />
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas de Visualização */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Visualizações Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{viewStats.today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Últimos 7 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{viewStats.week}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Últimos 30 Dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{viewStats.month}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Total de Visualizações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{viewStats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Produtos Mais Populares */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Produtos Mais Adicionados ao Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-lg">#{index + 1}</Badge>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-md" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <Badge className="text-base">{product.add_count} pedidos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Ainda não há dados de produtos populares.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gerenciar Catálogo</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={showOnlyVisible ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyVisible(!showOnlyVisible)}
              >
                {showOnlyVisible ? (
                  <><Eye className="w-4 h-4 mr-2" /> Visíveis</>
                ) : (
                  <><EyeOff className="w-4 h-4 mr-2" /> Todos</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-8">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos no catálogo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 shadow-sm"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                <p className="text-gray-500 animate-pulse">Carregando catálogo visual...</p>
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map(category => (
                  <CategorySection key={category.id} category={category} />
                ))}
              </div>
            ) : (
              <Card className="bg-gray-50 border-dashed border-2">
                <CardContent className="py-12 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum produto encontrado para organizar.</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Catalogos
