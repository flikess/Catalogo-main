import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Users, ShoppingCart, Package, TrendingUp, Calendar } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'

interface DashboardStats {
  totalClients: number
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  monthlyRevenue: number
  todayOrders: number
}

interface RecentOrder {
  id: string
  client_name: string
  total_amount: number
  status: string
  created_at: string
  delivery_date?: string
}

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    todayOrders: 0
  })
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchRecentOrders(),
        fetchUpcomingDeliveries()
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Total clients
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      // Total products
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      // Total orders
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      // Total revenue
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('user_id', user?.id)
        .in('status', ['confirmado', 'producao', 'pronto', 'entregue'])

      const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      // Monthly revenue (current month)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthlyData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('user_id', user?.id)
        .in('status', ['confirmado', 'producao', 'pronto', 'entregue'])
        .gte('created_at', startOfMonth.toISOString())

      const monthlyRevenue = monthlyData?.reduce((sum, order) => sum + order.total_amount, 0) || 0

      // Today's orders
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { count: todayOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString())

      setStats({
        totalClients: clientsCount || 0,
        totalProducts: productsCount || 0,
        totalOrders: ordersCount || 0,
        totalRevenue,
        monthlyRevenue,
        todayOrders: todayOrdersCount || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchRecentOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, client_name, total_amount, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      setRecentOrders(data || [])
    } catch (error) {
      console.error('Error fetching recent orders:', error)
    }
  }

  const fetchUpcomingDeliveries = async () => {
    try {
      const today = new Date()
      const nextWeek = new Date()
      nextWeek.setDate(today.getDate() + 7)

      const { data, error } = await supabase
        .from('orders')
        .select('id, client_name, total_amount, status, delivery_date')
        .eq('user_id', user?.id)
        .not('delivery_date', 'is', null)
        .gte('delivery_date', today.toISOString().split('T')[0])
        .lte('delivery_date', nextWeek.toISOString().split('T')[0])
        .in('status', ['confirmado', 'producao', 'pronto'])
        .order('delivery_date', { ascending: true })
        .limit(5)

      if (error) throw error
      setUpcomingDeliveries(data || [])
    } catch (error) {
      console.error('Error fetching upcoming deliveries:', error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'orcamento': 'bg-gray-100 text-gray-800',
      'confirmado': 'bg-blue-100 text-blue-800',
      'producao': 'bg-yellow-100 text-yellow-800',
      'pronto': 'bg-green-100 text-green-800',
      'entregue': 'bg-purple-100 text-purple-800',
      'cancelado': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.orcamento
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'orcamento': 'Orçamento',
      'confirmado': 'Confirmado',
      'producao': 'Em Produção',
      'pronto': 'Pronto',
      'entregue': 'Entregue',
      'cancelado': 'Cancelado'
    }
    return labels[status as keyof typeof labels] || status
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-4">Carregando dashboard...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do seu negócio
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                {formatPrice(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatPrice(stats.monthlyRevenue)} este mês
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {stats.totalClients}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes cadastrados
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Hoje</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {stats.todayOrders}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalOrders} total
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-xl lg:text-2xl font-bold">
                {stats.totalProducts}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Produtos cadastrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Últimos Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum pedido encontrado</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">#{order.id.slice(0, 8)}</p>
                          <Badge className={`${getStatusColor(order.status)} text-xs`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{order.client_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                      <div className="text-right sm:text-left">
                        <p className="font-medium text-sm text-green-600">{formatPrice(order.total_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Upcoming Deliveries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Próximas Entregas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeliveries.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma entrega programada</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {upcomingDeliveries.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">#{order.id.slice(0, 8)}</p>
                          <Badge className={`${getStatusColor(order.status)} text-xs`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{order.client_name}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 mr-1" />
                          {order.delivery_date ? formatDate(order.delivery_date) : 'Data não definida'}
                        </div>
                      </div>
                      <div className="text-right sm:text-left">
                        <p className="font-medium text-sm text-green-600">{formatPrice(order.total_amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard