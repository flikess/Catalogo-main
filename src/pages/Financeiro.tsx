import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DollarSign, TrendingUp, TrendingDown, Calendar, Download, Filter, Users, Package } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showError } from '@/utils/toast'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface FinancialData {
  totalRevenue: number
  monthlyRevenue: number
  averageOrderValue: number
  totalOrders: number
  paidOrders: number
  pendingRevenue: number
}

interface OrderFinancial {
  id: string
  client_name: string
  total_amount: number
  status: string
  payment_method?: string
  created_at: string
  delivery_date?: string
}

interface MonthlyData {
  month: string
  monthName: string
  revenue: number
  orders: number
}

interface ProductSales {
  product_name: string
  quantity: number
  revenue: number
}

interface TopClient {
  client_name: string
  total_orders: number
  total_spent: number
  last_order: string
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const Financeiro = () => {
  const { user } = useAuth()
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    averageOrderValue: 0,
    totalOrders: 0,
    paidOrders: 0,
    pendingRevenue: 0
  })
  const [orders, setOrders] = useState<OrderFinancial[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [productSales, setProductSales] = useState<ProductSales[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [statusFilter, setStatusFilter] = useState('paid')

  useEffect(() => {
    fetchFinancialData()
  }, [user, selectedYear, selectedMonth, statusFilter])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchOverviewData(),
        fetchOrders(),
        fetchMonthlyData(),
        fetchProductSales(),
        fetchTopClients()
      ])
    } catch (error) {
      console.error('Error fetching financial data:', error)
      showError('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  const fetchOverviewData = async () => {
    try {
      // Build date filter
      let dateFilter = ''
      if (selectedYear !== 'all') {
        const startDate = `${selectedYear}-01-01`
        const endDate = `${selectedYear}-12-31`
        dateFilter = `and created_at >= '${startDate}' and created_at <= '${endDate}'`
        
        if (selectedMonth !== 'all') {
          const monthStart = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`
          const nextMonth = parseInt(selectedMonth) === 12 ? 1 : parseInt(selectedMonth) + 1
          const nextYear = parseInt(selectedMonth) === 12 ? parseInt(selectedYear) + 1 : parseInt(selectedYear)
          const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
          dateFilter = `and created_at >= '${monthStart}' and created_at < '${monthEnd}'`
        }
      }

      // All orders
      const { data: allOrders } = await supabase
        .from('orders')
        .select('total_amount, status, created_at')
        .eq('user_id', user?.id)
        .gte('created_at', '1900-01-01') // Dummy filter to make it work with additional filters

      let filteredOrders = allOrders || []
      
      // Apply date filters
      if (selectedYear !== 'all') {
        const startDate = new Date(`${selectedYear}-01-01`)
        const endDate = new Date(`${selectedYear}-12-31T23:59:59`)
        
        if (selectedMonth !== 'all') {
          const monthStart = new Date(`${selectedYear}-${selectedMonth.padStart(2, '0')}-01`)
          const nextMonth = parseInt(selectedMonth) === 12 ? 1 : parseInt(selectedMonth) + 1
          const nextYear = parseInt(selectedMonth) === 12 ? parseInt(selectedYear) + 1 : parseInt(selectedYear)
          const monthEnd = new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)
          
          filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at)
            return orderDate >= monthStart && orderDate < monthEnd
          })
        } else {
          filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at)
            return orderDate >= startDate && orderDate <= endDate
          })
        }
      }

      // Paid orders (confirmed, in production, ready, delivered)
      const paidStatuses = ['confirmado', 'producao', 'pronto', 'entregue']
      const paidOrders = filteredOrders.filter(order => paidStatuses.includes(order.status))
      const pendingOrders = filteredOrders.filter(order => order.status === 'orcamento')

      const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total_amount, 0)
      const pendingRevenue = pendingOrders.reduce((sum, order) => sum + order.total_amount, 0)

      setFinancialData({
        totalRevenue,
        monthlyRevenue: totalRevenue, // For the selected period
        averageOrderValue: paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
        totalOrders: filteredOrders.length,
        paidOrders: paidOrders.length,
        pendingRevenue
      })
    } catch (error) {
      console.error('Error fetching overview data:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select('id, client_name, total_amount, status, payment_method, created_at, delivery_date')
        .eq('user_id', user?.id)

      // Apply status filter
      if (statusFilter === 'paid') {
        query = query.in('status', ['confirmado', 'producao', 'pronto', 'entregue'])
      } else if (statusFilter === 'pending') {
        query = query.eq('status', 'orcamento')
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(50)

      if (error) throw error
      
      let filteredData = data || []
      
      // Apply date filters
      if (selectedYear !== 'all') {
        const startDate = new Date(`${selectedYear}-01-01`)
        const endDate = new Date(`${selectedYear}-12-31T23:59:59`)
        
        if (selectedMonth !== 'all') {
          const monthStart = new Date(`${selectedYear}-${selectedMonth.padStart(2, '0')}-01`)
          const nextMonth = parseInt(selectedMonth) === 12 ? 1 : parseInt(selectedMonth) + 1
          const nextYear = parseInt(selectedMonth) === 12 ? parseInt(selectedYear) + 1 : parseInt(selectedYear)
          const monthEnd = new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)
          
          filteredData = filteredData.filter(order => {
            const orderDate = new Date(order.created_at)
            return orderDate >= monthStart && orderDate < monthEnd
          })
        } else {
          filteredData = filteredData.filter(order => {
            const orderDate = new Date(order.created_at)
            return orderDate >= startDate && orderDate <= endDate
          })
        }
      }

      setOrders(filteredData)
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const fetchMonthlyData = async () => {
    try {
      const year = selectedYear === 'all' ? currentYear : parseInt(selectedYear)
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, status')
        .eq('user_id', user?.id)
        .in('status', ['confirmado', 'producao', 'pronto', 'entregue'])
        .gte('created_at', `${year}-01-01`)
        .lte('created_at', `${year}-12-31`)

      if (error) throw error

      const monthlyMap = new Map<string, { revenue: number; orders: number }>()

      // Initialize all months
      for (let i = 1; i <= 12; i++) {
        const monthKey = `${year}-${String(i).padStart(2, '0')}`
        monthlyMap.set(monthKey, { revenue: 0, orders: 0 })
      }

      data?.forEach(order => {
        const date = new Date(order.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        
        if (monthlyMap.has(monthKey)) {
          const current = monthlyMap.get(monthKey)!
          current.revenue += order.total_amount
          current.orders += 1
        }
      })

      const monthNames = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
      ]

      const monthlyArray = Array.from(monthlyMap.entries()).map(([month, data]) => {
        const monthNum = parseInt(month.split('-')[1])
        return {
          month,
          monthName: monthNames[monthNum - 1],
          revenue: data.revenue,
          orders: data.orders
        }
      }).sort((a, b) => a.month.localeCompare(b.month))

      setMonthlyData(monthlyArray)
    } catch (error) {
      console.error('Error fetching monthly data:', error)
    }
  }

  const fetchProductSales = async () => {
    try {
      let dateFilter = ''
      if (selectedYear !== 'all') {
        dateFilter += ` and orders.created_at >= '${selectedYear}-01-01' and orders.created_at <= '${selectedYear}-12-31'`
        
        if (selectedMonth !== 'all') {
          const monthStart = `${selectedYear}-${selectedMonth.padStart(2, '0')}-01`
          const nextMonth = parseInt(selectedMonth) === 12 ? 1 : parseInt(selectedMonth) + 1
          const nextYear = parseInt(selectedMonth) === 12 ? parseInt(selectedYear) + 1 : parseInt(selectedYear)
          const monthEnd = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`
          dateFilter = ` and orders.created_at >= '${monthStart}' and orders.created_at < '${monthEnd}'`
        }
      }

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          total_price,
          orders!inner(user_id, status, created_at)
        `)
        .eq('orders.user_id', user?.id)
        .in('orders.status', ['confirmado', 'producao', 'pronto', 'entregue'])

      if (error) throw error

      let filteredData = data || []
      
      // Apply date filters
      if (selectedYear !== 'all') {
        const startDate = new Date(`${selectedYear}-01-01`)
        const endDate = new Date(`${selectedYear}-12-31T23:59:59`)
        
        if (selectedMonth !== 'all') {
          const monthStart = new Date(`${selectedYear}-${selectedMonth.padStart(2, '0')}-01`)
          const nextMonth = parseInt(selectedMonth) === 12 ? 1 : parseInt(selectedMonth) + 1
          const nextYear = parseInt(selectedMonth) === 12 ? parseInt(selectedYear) + 1 : parseInt(selectedYear)
          const monthEnd = new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)
          
          filteredData = filteredData.filter(item => {
            const orderDate = new Date(item.orders.created_at)
            return orderDate >= monthStart && orderDate < monthEnd
          })
        } else {
          filteredData = filteredData.filter(item => {
            const orderDate = new Date(item.orders.created_at)
            return orderDate >= startDate && orderDate <= endDate
          })
        }
      }

      const productMap = new Map<string, { quantity: number; revenue: number }>()

      filteredData.forEach(item => {
        if (!productMap.has(item.product_name)) {
          productMap.set(item.product_name, { quantity: 0, revenue: 0 })
        }
        const current = productMap.get(item.product_name)!
        current.quantity += item.quantity
        current.revenue += item.total_price
      })

      const productArray = Array.from(productMap.entries())
        .map(([product_name, data]) => ({
          product_name,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      setProductSales(productArray)
    } catch (error) {
      console.error('Error fetching product sales:', error)
    }
  }

  const fetchTopClients = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('client_name, total_amount, status, created_at')
        .eq('user_id', user?.id)
        .in('status', ['confirmado', 'producao', 'pronto', 'entregue'])

      if (error) throw error

      let filteredData = data || []
      
      // Apply date filters
      if (selectedYear !== 'all') {
        const startDate = new Date(`${selectedYear}-01-01`)
        const endDate = new Date(`${selectedYear}-12-31T23:59:59`)
        
        if (selectedMonth !== 'all') {
          const monthStart = new Date(`${selectedYear}-${selectedMonth.padStart(2, '0')}-01`)
          const nextMonth = parseInt(selectedMonth) === 12 ? 1 : parseInt(selectedMonth) + 1
          const nextYear = parseInt(selectedMonth) === 12 ? parseInt(selectedYear) + 1 : parseInt(selectedYear)
          const monthEnd = new Date(`${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`)
          
          filteredData = filteredData.filter(order => {
            const orderDate = new Date(order.created_at)
            return orderDate >= monthStart && orderDate < monthEnd
          })
        } else {
          filteredData = filteredData.filter(order => {
            const orderDate = new Date(order.created_at)
            return orderDate >= startDate && orderDate <= endDate
          })
        }
      }

      const clientMap = new Map<string, { total_orders: number; total_spent: number; last_order: string }>()

      filteredData.forEach(order => {
        if (!clientMap.has(order.client_name)) {
          clientMap.set(order.client_name, { 
            total_orders: 0, 
            total_spent: 0, 
            last_order: order.created_at 
          })
        }
        const current = clientMap.get(order.client_name)!
        current.total_orders += 1
        current.total_spent += order.total_amount
        if (new Date(order.created_at) > new Date(current.last_order)) {
          current.last_order = order.created_at
        }
      })

      const clientArray = Array.from(clientMap.entries())
        .map(([client_name, data]) => ({
          client_name,
          total_orders: data.total_orders,
          total_spent: data.total_spent,
          last_order: data.last_order
        }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10)

      setTopClients(clientArray)
    } catch (error) {
      console.error('Error fetching top clients:', error)
    }
  }

  const clearFilters = () => {
    setSelectedYear(currentYear.toString())
    setSelectedMonth('all')
    setStatusFilter('paid')
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

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="month">Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    <SelectItem value="1">Janeiro</SelectItem>
                    <SelectItem value="2">Fevereiro</SelectItem>
                    <SelectItem value="3">Março</SelectItem>
                    <SelectItem value="4">Abril</SelectItem>
                    <SelectItem value="5">Maio</SelectItem>
                    <SelectItem value="6">Junho</SelectItem>
                    <SelectItem value="7">Julho</SelectItem>
                    <SelectItem value="8">Agosto</SelectItem>
                    <SelectItem value="9">Setembro</SelectItem>
                    <SelectItem value="10">Outubro</SelectItem>
                    <SelectItem value="11">Novembro</SelectItem>
                    <SelectItem value="12">Dezembro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button onClick={clearFilters} variant="outline" className="w-full">
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(financialData.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {financialData.paidOrders} pedidos pagos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(financialData.averageOrderValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Por pedido pago
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {financialData.totalOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatPrice(financialData.pendingRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Orçamentos pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="charts" className="space-y-6">
          <TabsList>
            <TabsTrigger value="charts">Gráficos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="clients">Top Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Vendas por Mês */}
              <Card>
                <CardHeader>
                  <CardTitle>Vendas por Mês - {selectedYear}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthName" />
                      <YAxis tickFormatter={(value) => formatPrice(value)} />
                      <Tooltip 
                        formatter={(value: number) => [formatPrice(value), 'Faturamento']}
                        labelFormatter={(label) => `Mês: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Faturamento"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráfico de Produtos Mais Vendidos */}
              <Card>
                <CardHeader>
                  <CardTitle>Produtos Mais Vendidos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={productSales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="product_name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'quantity' ? `${value} unidades` : formatPrice(value),
                          name === 'quantity' ? 'Quantidade' : 'Faturamento'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="quantity" fill="#8884d8" name="Quantidade" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de Pizza - Faturamento por Produto */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Faturamento por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={productSales.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ product_name, percent }) => `${product_name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {productSales.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatPrice(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            {/* Tabela de pedidos */}
            <Card>
              <CardHeader>
                <CardTitle>Pedidos ({orders.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>{order.client_name}</TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(order.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.payment_method || '-'}
                        </TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            {/* Top Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Top 10 Clientes que Mais Compram
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posição</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Total de Pedidos</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Último Pedido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClients.map((client, index) => (
                      <TableRow key={client.client_name}>
                        <TableCell>
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        <TableCell>{client.total_orders} pedidos</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatPrice(client.total_spent)}
                        </TableCell>
                        <TableCell>{formatDate(client.last_order)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default Financeiro