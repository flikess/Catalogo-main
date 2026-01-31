import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Upload, X, Image as ImageIcon, Tag, List } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
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
  show_in_catalog: boolean
  image_url?: string
  categoria_id?: string
  created_at: string
  categorias_produtos?: {
    nome: string
  }
  adicionais?: Additional[]
}

interface Category {
  id: string
  nome: string
  created_at: string
}

const Produtos = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isCategoriesListOpen, setIsCategoriesListOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoria_id: '',
    show_in_catalog: true,
    image_url: '',
    adicionais: [] as Additional[]
  })
  const [categoryFormData, setCategoryFormData] = useState({
    nome: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categorias_produtos (
            nome
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Garantir que adicionais seja sempre um array
      const formattedProducts = data?.map(product => ({
        ...product,
        adicionais: product.adicionais ? JSON.parse(JSON.stringify(product.adicionais)) : []
      })) || []
      
      setProducts(formattedProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
      showError('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true)
      const { data, error } = await supabase
        .from('categorias_produtos')
        .select('*')
        .eq('user_id', user?.id)
        .order('nome')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
      showError('Erro ao carregar categorias')
    } finally {
      setLoadingCategories(false)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      showError('Erro ao fazer upload da imagem')
      return null
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (imageUrl: string) => {
    try {
      const urlParts = imageUrl.split('/product-images/')
      if (urlParts.length < 2) return
      
      const filePath = urlParts[1]
      
      const { error } = await supabase.storage
        .from('product-images')
        .remove([filePath])

      if (error) throw error
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Por favor, selecione apenas arquivos de imagem')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('A imagem deve ter no máximo 5MB')
      return
    }

    setSelectedFile(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setFormData({ ...formData, image_url: '' })
  }

  const handleAdditionalChange = (index: number, field: keyof Additional, value: string) => {
    const newAdditionais = [...formData.adicionais]
    
    if (field === 'price') {
      newAdditionais[index][field] = parseFloat(value) || 0
    } else {
      newAdditionais[index][field] = value as any
    }
    
    setFormData({ ...formData, adicionais: newAdditionais })
  }

  const addAdditional = () => {
    setFormData({ 
      ...formData, 
      adicionais: [...formData.adicionais, { name: '', price: 0 }] 
    })
  }

  const removeAdditional = (index: number) => {
    const newAdditionais = formData.adicionais.filter((_, i) => i !== index)
    setFormData({ ...formData, adicionais: newAdditionais })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.categoria_id) {
      showError('Por favor, selecione uma categoria')
      return
    }
    
    try {
      let imageUrl = formData.image_url

      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile)
        if (uploadedUrl) {
          imageUrl = uploadedUrl
        } else {
          showError('Erro ao fazer upload da imagem')
          return
        }
      }

      // Preparar os adicionais para envio
      const adicionaisParaEnviar = formData.adicionais.length > 0 
        ? formData.adicionais.map(add => ({
            name: add.name.trim(),
            price: Number(add.price)
          }))
        : null

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        categoria_id: formData.categoria_id,
        show_in_catalog: formData.show_in_catalog,
        image_url: imageUrl || null,
        adicionais: adicionaisParaEnviar,
        updated_at: new Date().toISOString()
      }

      console.log('Dados a serem enviados:', productData) // Para debug

      if (editingProduct) {
        if (selectedFile && editingProduct.image_url) {
          await deleteImage(editingProduct.image_url)
        }

        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (error) throw error
        showSuccess('Produto atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            ...productData,
            user_id: user?.id
          })

        if (error) throw error
        showSuccess('Produto criado com sucesso!')
      }

      setIsDialogOpen(false)
      setEditingProduct(null)
      resetForm()
      fetchProducts()
    } catch (error) {
      console.error('Error saving product:', error)
      showError('Erro ao salvar produto: ' + (error as any).message)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!categoryFormData.nome.trim()) {
      showError('Nome da categoria é obrigatório')
      return
    }
    
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categorias_produtos')
          .update({
            nome: categoryFormData.nome.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCategory.id)

        if (error) throw error
        showSuccess('Categoria atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('categorias_produtos')
          .insert({
            nome: categoryFormData.nome.trim(),
            user_id: user?.id
          })

        if (error) throw error
        showSuccess('Categoria criada com sucesso!')
      }

      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ nome: '' })
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      showError('Erro ao salvar categoria')
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      categoria_id: product.categoria_id || '',
      show_in_catalog: product.show_in_catalog,
      image_url: product.image_url || '',
      adicionais: product.adicionais || []
    })
    
    if (product.image_url) {
      setImagePreview(product.image_url)
    }
    
    setIsDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      nome: category.nome
    })
    setIsCategoryDialogOpen(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return

    try {
      const product = products.find(p => p.id === productId)
      
      if (product?.image_url) {
        await deleteImage(product.image_url)
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      showSuccess('Produto excluído com sucesso!')
      fetchProducts()
    } catch (error) {
      console.error('Error deleting product:', error)
      showError('Erro ao excluir produto')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const productsInCategory = products.filter(p => p.categoria_id === categoryId)
    if (productsInCategory.length > 0) {
      showError('Não é possível excluir esta categoria pois existem produtos vinculados a ela')
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    try {
      const { error } = await supabase
        .from('categorias_produtos')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
      showSuccess('Categoria excluída com sucesso!')
      fetchCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      showError('Erro ao excluir categoria')
    }
  }

  const toggleCatalogVisibility = async (product: Product) => {
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

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoria_id: '',
      show_in_catalog: true,
      image_url: '',
      adicionais: []
    })
    setSelectedFile(null)
    setImagePreview(null)
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categorias_produtos?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
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
            {row.description && (
              <div className="text-sm text-muted-foreground truncate">
                {row.description}
              </div>
            )}
            {row.categorias_produtos && (
              <Badge variant="outline" className="mt-1">
                {row.categorias_produtos.nome}
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Preço',
      render: (value: number) => (
        <span className="font-medium text-green-600">
          {formatPrice(value)}
        </span>
      )
    },
    {
      key: 'show_in_catalog',
      label: 'Catálogo',
      render: (value: boolean, row: Product) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleCatalogVisibility(row)}
          className={value ? 'text-green-600' : 'text-gray-400'}
        >
          {value ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </Button>
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      hideOnMobile: true,
      render: (value: string) => (
        <Badge variant="outline">
          {formatDate(value)}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (_: any, row: Product) => (
        <div className="flex gap-2 justify-end">
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
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsCategoriesListOpen(true)}
            >
              <List className="w-4 h-4 mr-2" />
              Categorias
            </Button>

            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => {
                  setEditingCategory(null)
                  setCategoryFormData({ nome: '' })
                }}>
                  <Tag className="w-4 h-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category_name">Nome da Categoria *</Label>
                    <Input
                      id="category_name"
                      value={categoryFormData.nome}
                      onChange={(e) => setCategoryFormData({ nome: e.target.value })}
                      placeholder="Ex: Bolos de Aniversário"
                      required
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingProduct(null) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do produto"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoria_id">Categoria *</Label>
                    <Select 
                      value={formData.categoria_id} 
                      onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria..." />
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descrição do produto"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  
                  {/* Seção de Adicionais */}
                  <div className="space-y-2">
                    <Label>Adicionais</Label>
                    <div className="space-y-3">
                      {formData.adicionais.map((additional, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Nome do adicional"
                            value={additional.name}
                            onChange={(e) => handleAdditionalChange(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Preço"
                            value={additional.price}
                            onChange={(e) => handleAdditionalChange(index, 'price', e.target.value)}
                            className="w-32"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAdditional(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addAdditional}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Opcional
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Imagem do Produto</Label>
                    
                    {imagePreview && (
                      <div className="relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-32 object-cover rounded-md border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={clearImage}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    
                    {!imagePreview && (
                      <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-2">
                            <Label htmlFor="image-upload" className="cursor-pointer">
                              <span className="text-sm text-blue-600 hover:text-blue-500">
                                Clique para fazer upload
                              </span>
                              <Input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                            </Label>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, GIF até 5MB
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show_in_catalog"
                      checked={formData.show_in_catalog}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_in_catalog: checked })}
                    />
                    <Label htmlFor="show_in_catalog">Mostrar no catálogo</Label>
                  </div>
                  
                  <DialogFooter>
                    <Button type="submit" disabled={uploading}>
                      {uploading ? 'Fazendo upload...' : editingProduct ? 'Atualizar' : 'Criar'}
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

        <Dialog open={isCategoriesListOpen} onOpenChange={setIsCategoriesListOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Categorias de Produtos</DialogTitle>
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
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                          Nenhuma categoria cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.nome}</TableCell>
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

        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos ou categorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos ({filteredProducts.length})</CardTitle>
          </CardHeader>
          <CardContent>
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

export default Produtos
