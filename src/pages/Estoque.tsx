import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, TrendingUp, TrendingDown, Tag, List, ShoppingBag } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showSuccess, showError } from '@/utils/toast'

interface StockItem {
  id: string
  name: string
  description?: string
  quantity: number
  unit: string
  minimum_stock: number
  cost_per_unit: number
  supplier?: string
  category_id?: string
  created_at: string
  stock_categories?: {
    name: string
  }
}

interface StockMovement {
  id: string
  stock_item_id: string
  type: 'entrada' | 'saida'
  quantity: number
  reason?: string
  notes?: string
  created_at: string
}

interface Product {
  id: string
  name: string
  track_stock: boolean
  stock_quantity: number
  categorias_produtos?: {
    nome: string
  }
}

interface StockCategory {
  id: string
  name: string
  description?: string
  created_at: string
}

const units = [
  'unidade',
  'kg',
  'g',
  'litro',
  'ml',
  'pacote',
  'caixa',
  'dúzia'
]

const Estoque = () => {
  const { user } = useAuth()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [stockCategories, setStockCategories] = useState<StockCategory[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isCategoriesListOpen, setIsCategoriesListOpen] = useState(false)
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<StockCategory | null>(null)
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    unit: 'unidade',
    minimum_stock: '',
    cost_per_unit: '',
    supplier: '',
    category_id: ''
  })
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  })
  const [movementData, setMovementData] = useState({
    type: 'entrada' as 'entrada' | 'saida',
    quantity: '',
    reason: '',
    notes: ''
  })

  useEffect(() => {
    fetchStockItems()
    fetchStockCategories()
    fetchProducts()
    fetchMovements()
  }, [])

  const fetchStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select(`
          *,
          stock_categories (
            name
          )
        `)
        .eq('user_id', user?.id)
        .order('name')

      if (error) throw error
      setStockItems(data || [])
    } catch (error) {
      console.error('Error fetching stock items:', error)
      showError('Erro ao carregar itens do estoque')
    } finally {
      setLoading(false)
    }
  }

  const fetchStockCategories = async () => {
    try {
      setLoadingCategories(true)
      const { data, error } = await supabase
        .from('stock_categories')
        .select('*')
        .eq('user_id', user?.id)
        .order('name')

      if (error) throw error
      setStockCategories(data || [])
    } catch (error) {
      console.error('Error fetching stock categories:', error)
      showError('Erro ao carregar categorias de estoque')
    } finally {
      setLoadingCategories(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          track_stock,
          stock_quantity,
          categorias_produtos (
            nome
          )
        `)
        .eq('user_id', user?.id)
        .eq('track_stock', true)
        .order('name')

      if (error) throw error

      const formattedData = (data || []).map((p: any) => ({
        ...p,
        categorias_produtos: Array.isArray(p.categorias_produtos)
          ? p.categorias_produtos[0]
          : p.categorias_produtos
      }))

      setProducts(formattedData)
    } catch (error) {
      console.error('Error fetching products for stock:', error)
    }
  }

  const fetchMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          stock_items!inner(name, user_id)
        `)
        .eq('stock_items.user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setMovements(data || [])
    } catch (error) {
      console.error('Error fetching movements:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.category_id) {
      showError('Por favor, selecione uma categoria')
      return
    }

    try {
      const itemData = {
        name: formData.name,
        description: formData.description || null,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        minimum_stock: parseFloat(formData.minimum_stock) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
        supplier: formData.supplier || null,
        category_id: formData.category_id
      }

      if (editingItem) {
        const { error } = await supabase
          .from('stock_items')
          .update({
            ...itemData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)

        if (error) throw error
        showSuccess('Item atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('stock_items')
          .insert({
            ...itemData,
            user_id: user?.id
          })

        if (error) throw error
        showSuccess('Item criado com sucesso!')
      }

      setIsDialogOpen(false)
      setEditingItem(null)
      resetForm()
      fetchStockItems()
    } catch (error) {
      console.error('Error saving item:', error)
      showError('Erro ao salvar item')
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      showError('Nome da categoria é obrigatório')
      return
    }

    try {
      if (editingCategory) {
        // Atualizar categoria existente
        const { error } = await supabase
          .from('stock_categories')
          .update({
            name: categoryFormData.name.trim(),
            description: categoryFormData.description.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id)

        if (error) throw error
        showSuccess('Categoria atualizada com sucesso!')
      } else {
        // Criar nova categoria
        const { error } = await supabase
          .from('stock_categories')
          .insert({
            user_id: user?.id,
            name: categoryFormData.name.trim(),
            description: categoryFormData.description.trim() || null
          })

        if (error) throw error
        showSuccess('Categoria criada com sucesso!')
      }

      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ name: '', description: '' })
      fetchStockCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      showError('Erro ao salvar categoria')
    }
  }

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedItem) return

    try {
      const quantity = parseFloat(movementData.quantity)

      // Registrar movimentação
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          stock_item_id: selectedItem.id,
          type: movementData.type,
          quantity,
          reason: movementData.reason || null,
          notes: movementData.notes || null
        })

      if (movementError) throw movementError

      // Atualizar quantidade em estoque
      const newQuantity = movementData.type === 'entrada'
        ? selectedItem.quantity + quantity
        : selectedItem.quantity - quantity

      const { error: updateError } = await supabase
        .from('stock_items')
        .update({
          quantity: Math.max(0, newQuantity),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItem.id)

      if (updateError) throw updateError

      showSuccess(`${movementData.type === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`)
      setIsMovementDialogOpen(false)
      setSelectedItem(null)
      resetMovementForm()
      fetchStockItems()
      fetchProducts()
      fetchMovements()
    } catch (error) {
      console.error('Error recording movement:', error)
      showError('Erro ao registrar movimentação')
    }
  }

  const handleEdit = (item: StockItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      quantity: item.quantity.toString(),
      unit: item.unit,
      minimum_stock: item.minimum_stock.toString(),
      cost_per_unit: item.cost_per_unit.toString(),
      supplier: item.supplier || '',
      category_id: item.category_id || ''
    })
    setIsDialogOpen(true)
  }

  const handleEditCategory = (category: StockCategory) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || ''
    })
    setIsCategoryDialogOpen(true)
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item?')) return

    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
      showSuccess('Item excluído com sucesso!')
      fetchStockItems()
    } catch (error) {
      console.error('Error deleting item:', error)
      showError('Erro ao excluir item')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    // Verificar se existem itens nesta categoria
    const itemsInCategory = stockItems.filter(item => item.category_id === categoryId)
    if (itemsInCategory.length > 0) {
      showError('Não é possível excluir esta categoria pois existem itens vinculados a ela')
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      const { error } = await supabase
        .from('stock_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
      showSuccess('Categoria excluída com sucesso!')
      fetchStockCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      showError('Erro ao excluir categoria')
    }
  }

  const openMovementDialog = (item: StockItem) => {
    setSelectedItem(item)
    setIsMovementDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      quantity: '',
      unit: 'unidade',
      minimum_stock: '',
      cost_per_unit: '',
      supplier: '',
      category_id: ''
    })
  }

  const resetMovementForm = () => {
    setMovementData({
      type: 'entrada',
      quantity: '',
      reason: '',
      notes: ''
    })
  }

  const filteredItems = stockItems.filter(item =>
    item.stock_categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categorias_produtos?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const lowStockItems = stockItems.filter(item =>
    item.quantity <= item.minimum_stock && item.minimum_stock > 0
  )

  const lowStockProducts = products.filter(product =>
    product.stock_quantity <= 5 // Alerta arbitrário para produtos (abaixo de 5 unidades)
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const getStockStatus = (item: StockItem) => {
    if (item.minimum_stock > 0 && item.quantity <= item.minimum_stock) {
      return { label: 'Baixo', color: 'bg-red-100 text-red-800' }
    }
    if (item.minimum_stock > 0 && item.quantity <= item.minimum_stock * 1.5) {
      return { label: 'Atenção', color: 'bg-yellow-100 text-yellow-800' }
    }
    return { label: 'Normal', color: 'bg-green-100 text-green-800' }
  }

  const tableColumns = [
    {
      key: 'name',
      label: 'Item',
      render: (value: string, row: StockItem) => (
        <div>
          <div className="font-medium">{value}</div>
          {row.description && (
            <div className="text-sm text-muted-foreground">{row.description}</div>
          )}
          {row.stock_categories && (
            <Badge variant="outline" className="mt-1">
              {row.stock_categories.name}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'quantity',
      label: 'Quantidade',
      render: (value: number, row: StockItem) => (
        <div>
          <span className="font-medium">{value} {row.unit}</span>
          {row.minimum_stock > 0 && (
            <div className="text-xs text-muted-foreground">
              Mín: {row.minimum_stock} {row.unit}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, row: StockItem) => {
        const status = getStockStatus(row)
        return <Badge className={status.color}>{status.label}</Badge>
      }
    },
    {
      key: 'cost_per_unit',
      label: 'Custo Unit.',
      hideOnMobile: true,
      render: (value: number) => (value > 0 ? formatPrice(value) : '-')
    },
    {
      key: 'supplier',
      label: 'Fornecedor',
      hideOnMobile: true,
      render: (value: string) => value || '-'
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (_: any, row: StockItem) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openMovementDialog(row)}
            title="Registrar movimentação"
          >
            <Package className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(row.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <div className="flex gap-2">
            {/* Botão Listar Categorias */}
            <Button
              variant="outline"
              onClick={() => setIsCategoriesListOpen(true)}
            >
              <List className="w-4 h-4 mr-2" />
              Categorias
            </Button>

            {/* Botão Nova Categoria */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {
                  setEditingCategory(null)
                  setCategoryFormData({ name: '', description: '' })
                }}>
                  <Tag className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria de Estoque'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_name">Nome da Categoria *</Label>
                    <Input
                      id="category_name"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      placeholder="Ex: Ingredientes Especiais"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_description">Descrição</Label>
                    <Textarea
                      id="category_description"
                      value={categoryFormData.description}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                      placeholder="Descrição da categoria (opcional)"
                      rows={2}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {editingCategory ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCategoryDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Botão Novo Item */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingItem(null) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? 'Editar Item' : 'Novo Item'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do item"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category_id">Categoria *</Label>
                    <Select
                      value={formData.category_id}
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stockCategories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição do item"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantidade *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit">Unidade</Label>
                      <Select value={formData.unit} onValueChange={(value) => setFormData({ ...formData, unit: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="minimum_stock">Estoque Mínimo</Label>
                      <Input
                        id="minimum_stock"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minimum_stock}
                        onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cost_per_unit">Custo Unitário</Label>
                      <Input
                        id="cost_per_unit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_per_unit}
                        onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supplier">Fornecedor</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Nome do fornecedor"
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {editingItem ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Modal de Listagem de Categorias */}
        <Dialog open={isCategoriesListOpen} onOpenChange={setIsCategoriesListOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Categorias de Estoque</DialogTitle>
            </DialogHeader>

            {loadingCategories ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Nenhuma categoria cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockCategories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditCategory(category)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteCategory(category.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <Button
                  onClick={() => {
                    setIsCategoriesListOpen(false)
                    setIsCategoryDialogOpen(true)
                  }}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Nova Categoria
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Alertas de estoque baixo */}
        {(lowStockItems.length > 0 || lowStockProducts.length > 0) && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Alertas de Estoque Baixo ({lowStockItems.length + lowStockProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-white rounded border shadow-sm">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <span className="text-red-600 font-semibold">
                      {item.quantity} {item.unit} (mín: {item.minimum_stock})
                    </span>
                  </div>
                ))}
                {lowStockProducts.map(product => (
                  <div key={product.id} className="flex justify-between items-center p-2 bg-white rounded border shadow-sm">
                    <div className="flex items-center">
                      <ShoppingBag className="w-4 h-4 mr-2 text-primary" />
                      <span className="font-medium">{product.name} (Produto Final)</span>
                    </div>
                    <span className="text-red-600 font-semibold">
                      {product.stock_quantity} un (crítico: 5)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, fornecedor ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stock Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Insumos / Matéria Prima ({filteredItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              data={filteredItems}
              columns={tableColumns}
              loading={loading}
              emptyMessage={searchTerm ? 'Nenhum item encontrado' : 'Nenhum item de insumo cadastrado'}
            />
          </CardContent>
        </Card>

        {/* Products Stock Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Produtos Finais com Controle ({filteredProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Estoque Atual</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto com controle de estoque ativo'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map(product => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {product.categorias_produtos?.nome || 'Sem categoria'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${product.stock_quantity <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {product.stock_quantity} unidades
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Redireciona para edição do produto se necessário ou abre modal
                            window.location.href = `/produtos?edit=${product.id}`
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Ajustar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Movement Dialog */}
        <Dialog open={isMovementDialogOpen} onOpenChange={setIsMovementDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Registrar Movimentação - {selectedItem?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleMovement} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Movimentação</Label>
                <Select value={movementData.type} onValueChange={(value: 'entrada' | 'saida') => setMovementData({ ...movementData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">
                      <div className="flex items-center">
                        <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                        Entrada
                      </div>
                    </SelectItem>
                    <SelectItem value="saida">
                      <div className="flex items-center">
                        <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
                        Saída
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="movement_quantity">Quantidade *</Label>
                <Input
                  id="movement_quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={movementData.quantity}
                  onChange={(e) => setMovementData({ ...movementData, quantity: e.target.value })}
                  placeholder={`Quantidade em ${selectedItem?.unit}`}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  value={movementData.reason}
                  onChange={(e) => setMovementData({ ...movementData, reason: e.target.value })}
                  placeholder="Ex: Compra, Uso em produção, Perda"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={movementData.notes}
                  onChange={(e) => setMovementData({ ...movementData, notes: e.target.value })}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>

              <DialogFooter>
                <Button type="submit">
                  Registrar {movementData.type === 'entrada' ? 'Entrada' : 'Saída'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsMovementDialogOpen(false)
                    resetMovementForm()
                  }}
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  )
}

export default Estoque
