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

interface SizeOption {
  name: string
  price?: number | null
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
  sizes?: SizeOption[]
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
    adicionais: [] as Additional[],
    sizes: [] as SizeOption[]
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

      const formatted = (data || []).map(p => ({
        ...p,
        adicionais: p.adicionais || [],
        sizes: p.sizes || []
      }))

      setProducts(formatted)
    } catch (error) {
      console.error(error)
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
      console.error(error)
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

      const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file)

      if (error) throw error

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)

      return data.publicUrl
    } catch (error) {
      console.error(error)
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

      await supabase.storage
        .from('product-images')
        .remove([filePath])
    } catch {}
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione uma imagem')
      return
    }

    setSelectedFile(file)

    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const clearImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setFormData({ ...formData, image_url: '' })
  }

  const handleAdditionalChange = (index: number, field: keyof Additional, value: string) => {
    const newList = [...formData.adicionais]

    if (field === 'price') newList[index][field] = Number(value)
    else newList[index][field] = value as any

    setFormData({ ...formData, adicionais: newList })
  }

  const addAdditional = () => {
    setFormData({
      ...formData,
      adicionais: [...formData.adicionais, { name: '', price: 0 }]
    })
  }

  const removeAdditional = (index: number) => {
    setFormData({
      ...formData,
      adicionais: formData.adicionais.filter((_, i) => i !== index)
    })
  }

  /* =======================
     TAMANHOS
  ======================= */

  const addSize = () => {
    setFormData({
      ...formData,
      sizes: [...formData.sizes, { name: '', price: null }]
    })
  }

  const updateSize = (index: number, field: keyof SizeOption, value: string) => {
    const list = [...formData.sizes]

    if (field === 'price') {
      list[index].price = value === '' ? null : Number(value)
    } else {
      list[index].name = value
    }

    setFormData({ ...formData, sizes: list })
  }

  const removeSize = (index: number) => {
    setFormData({
      ...formData,
      sizes: formData.sizes.filter((_, i) => i !== index)
    })
  }

  
const handlePriceChange = (value: string) => {
   // Remove tudo que não seja número
  let numeric = value.replace(/\D/g, '')

  if (!numeric) {
    setFormData({ ...formData, price: '' })
    return
  }

  // Adiciona vírgula antes dos dois últimos dígitos
  if (numeric.length === 1) numeric = '0' + numeric
  const integerPart = numeric.slice(0, -2)
  const decimalPart = numeric.slice(-2)

  const formatted = integerPart + ',' + decimalPart
  setFormData({ ...formData, price: formatted })
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.categoria_id) {
      showError('Selecione a categoria')
      return
    }

    try {
      let imageUrl = formData.image_url

      if (selectedFile) {
        const uploadedUrl = await uploadImage(selectedFile)
        if (!uploadedUrl) return
        imageUrl = uploadedUrl
      }

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: Number(formData.price.replace(',', '.')),
        categoria_id: formData.categoria_id,
        show_in_catalog: formData.show_in_catalog,
        image_url: imageUrl || null,
        adicionais: formData.adicionais.length ? formData.adicionais : null,
        sizes: formData.sizes.length ? formData.sizes : null,
        updated_at: new Date().toISOString()
      }

      if (editingProduct) {
        if (selectedFile && editingProduct.image_url) {
          await deleteImage(editingProduct.image_url)
        }

        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)

        if (error) throw error

        showSuccess('Produto atualizado!')
      } else {
        const { error } = await supabase
          .from('products')
          .insert({
            ...productData,
            user_id: user?.id
          })

        if (error) throw error

        showSuccess('Produto criado!')
      }

      setIsDialogOpen(false)
      setEditingProduct(null)
      resetForm()
      fetchProducts()
    } catch (error: any) {
      console.error(error)
      showError(error.message || 'Erro ao salvar')
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

   const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      nome: category.nome
    })
    setIsCategoryDialogOpen(true)
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



  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoria_id: '',
      show_in_catalog: true,
      image_url: '',
      adicionais: [],
      sizes: []
    })
    setSelectedFile(null)
    setImagePreview(null)
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
      adicionais: product.adicionais || [],
      sizes: product.sizes || []
    })

    setImagePreview(product.image_url || null)
    setIsDialogOpen(true)
  }

  const toggleCatalogVisibility = async (product: Product) => {
    await supabase
      .from('products')
      .update({ show_in_catalog: !product.show_in_catalog })
      .eq('id', product.id)

    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir produto?')) return

    await supabase.from('products').delete().eq('id', id)

    fetchProducts()
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price)

  const tableColumns = [
    {
      key: 'name',
      label: 'Produto',
      render: (value: string, row: Product) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} className="w-12 h-12 rounded object-cover" />
          ) : (
            <div className="w-12 h-12 bg-muted flex items-center justify-center rounded">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}

          <div>
            <div className="font-medium">{value}</div>

            {row.sizes && row.sizes.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Tamanhos: {row.sizes.map(s => s.name).join(', ')}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'price',
      label: 'Preço base',
      render: (v: number) => (
        <span className="font-medium text-green-600">{formatPrice(v)}</span>
      )
    },
    {
      key: 'show_in_catalog',
      label: 'Catálogo',
      render: (v: boolean, row: Product) => (
        <Button variant="ghost" size="sm" onClick={() => toggleCatalogVisibility(row)}>
          {v ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (_: any, row: Product) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDelete(row.id)}>
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
  type="text"
  placeholder="0,00"
  value={formData.price}
  onChange={(e) => handlePriceChange(e.target.value)}
  required
/>

                  </div>
                       <div className="space-y-2">
                  <Label>Tamanhos / variações</Label>

                  {formData.sizes.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Ex: P, M, G"
                        value={s.name}
                        onChange={e => updateSize(i, 'name', e.target.value)}
                      />

                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço (opcional)"
                        value={s.price ?? ''}
                        onChange={e => updateSize(i, 'price', e.target.value)}
                      />

                      <Button type="button" variant="outline" onClick={() => removeSize(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addSize} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar tamanho
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Se o preço ficar vazio, será usado o preço base.
                  </p>
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
                  <Button type="submit">
                    {editingProduct ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                className="pl-9"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              data={filteredProducts}
              columns={tableColumns}
              loading={loading}
              emptyMessage="Nenhum produto"
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Produtos
