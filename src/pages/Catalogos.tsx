import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Search, Eye, EyeOff, ExternalLink, Copy, MessageCircle, Image as ImageIcon, BarChart2, Calendar, Star } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showSuccess, showError } from '@/utils/toast'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  show_in_catalog: boolean
  image_url?: string
  created_at: string
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
  const [bakerySettings, setBakerySettings] = useState<BakerySettings>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyVisible, setShowOnlyVisible] = useState(false)
  const [viewStats, setViewStats] = useState<ViewStats>({ today: 0, week: 0, month: 0, total: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])

  useEffect(() => {
    fetchProducts()
    fetchBakerySettings()
    fetchStats()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user?.id)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      showError('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
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
    const message = `🧁 Confira nosso catálogo de produtos!\n\n${bakerySettings.bakery_name || 'Nossa Confeitaria'}\n\n${url}`
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
        <div className="flex flex-col items-center">
          <Badge 
            className={value 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
            }
          >
            {value ? 'Visível' : 'Oculto'}
          </Badge>
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
          <CardHeader>
            <CardTitle>Gerenciar Produtos no Catálogo ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showOnlyVisible ? "default" : "outline"}
                onClick={() => setShowOnlyVisible(!showOnlyVisible)}
              >
                {showOnlyVisible ? 'Mostrar Todos' : 'Apenas Visíveis'}
              </Button>
            </div>
            <ResponsiveTable
              data={filteredProducts}
              columns={tableColumns}
              loading={loading}
              emptyMessage={searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Catalogos
