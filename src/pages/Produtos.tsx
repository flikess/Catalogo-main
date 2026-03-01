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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Upload, X, Image as ImageIcon, Tag, List, Layers } from 'lucide-react'
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

interface VariationOption {
  name: string
  price?: number | null
}

interface VariationGroup {
  name: string
  options: VariationOption[]
}

interface Product {
  id: string
  name: string
  description?: string
  price: number
  show_in_catalog: boolean
  image_url?: string
  image_urls?: string[]
  categoria_id?: string
  sub_categoria_id?: string
  created_at: string
  categorias_produtos?: {
    nome: string
  }
  subcategorias_produtos?: {
    nome: string
  }
  adicionais?: Additional[]
  sizes?: SizeOption[]
  variations?: VariationGroup[]
  track_stock: boolean
  stock_quantity?: number
}


interface Category {
  id: string
  nome: string
  banner_desktop_url?: string
  banner_mobile_url?: string
  created_at: string
}

interface Subcategory {
  id: string
  nome: string
  categoria_id: string
  created_at: string
}

const Produtos = () => {
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isSubCategoryDialogOpen, setIsSubCategoryDialogOpen] = useState(false)
  const [isCategoriesListOpen, setIsCategoriesListOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingSubCategory, setEditingSubCategory] = useState<Subcategory | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>([null, null, null])
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('all')

  const [categoryBannerDesktop, setCategoryBannerDesktop] = useState<File | null>(null)
  const [categoryBannerMobile, setCategoryBannerMobile] = useState<File | null>(null)
  const [categoryBannerDesktopPreview, setCategoryBannerDesktopPreview] = useState<string | null>(null)
  const [categoryBannerMobilePreview, setCategoryBannerMobilePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoria_id: '',
    sub_categoria_id: '',
    show_in_catalog: true,
    image_url: '',
    image_urls: [] as string[],
    adicionais: [] as Additional[],
    sizes: [] as SizeOption[],
    variations: [] as VariationGroup[],
    track_stock: false,
    stock_quantity: '0'
  })

  const [categoryFormData, setCategoryFormData] = useState({
    nome: '',
    banner_desktop_url: '',
    banner_mobile_url: ''
  })

  const [subCategoryFormData, setSubCategoryFormData] = useState({
    nome: '',
    categoria_id: ''
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
          ),
          subcategorias_produtos (
            nome
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formatted = (data || []).map(p => ({
        ...p,
        adicionais: p.adicionais || [],
        sizes: p.sizes || [],
        variations: p.variations || [],
        image_urls: p.image_urls || (p.image_url ? [p.image_url] : [])
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

      const [catRes, subRes] = await Promise.all([
        supabase
          .from('categorias_produtos')
          .select('*')
          .eq('user_id', user?.id)
          .order('nome'),
        supabase
          .from('subcategorias_produtos')
          .select('*')
          .eq('user_id', user?.id)
          .order('nome')
      ])

      if (catRes.error) throw catRes.error
      setCategories(catRes.data || [])

      if (subRes.error) {
        // Se a tabela de subcategorias não existir ainda, apenas ignora
        if (subRes.error.code !== 'PGRST116') {
          console.error('Erro ao carregar subcategorias:', subRes.error)
        }
      } else {
        setSubcategories(subRes.data || [])
      }
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
    } catch { }
  }

  const handleFileSelectMulti = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione uma imagem')
      return
    }

    const newFiles = [...selectedFiles]
    newFiles[index] = file
    setSelectedFiles(newFiles)

    const reader = new FileReader()
    reader.onload = e => {
      const newPreviews = [...imagePreviews]
      newPreviews[index] = e.target?.result as string
      setImagePreviews(newPreviews)
    }
    reader.readAsDataURL(file)
  }

  const clearImageMulti = (index: number) => {
    const newFiles = [...selectedFiles]
    newFiles[index] = null
    setSelectedFiles(newFiles)

    const newPreviews = [...imagePreviews]
    newPreviews[index] = null
    setImagePreviews(newPreviews)

    const newUrls = [...formData.image_urls]
    if (newUrls[index]) {
      newUrls[index] = ''
    }
    setFormData({ ...formData, image_urls: newUrls })
  }

  const handleAdditionalChange = (index: number, field: keyof Additional, value: string) => {
    const newList = [...formData.adicionais]

    if (field === 'price') {
      // Remove tudo que não seja número e vírgula
      let numeric = value.replace(/\D/g, '')
      if (!numeric) {
        newList[index][field] = 0
      } else {
        numeric = numeric.replace(/^0+/, '')
        if (numeric.length <= 2) {
          newList[index][field] = parseFloat('0.' + numeric.padStart(2, '0'))
        } else {
          const integerPart = numeric.slice(0, -2)
          const decimalPart = numeric.slice(-2)
          newList[index][field] = parseFloat(integerPart + '.' + decimalPart)
        }
      }
    } else {
      newList[index][field] = value
    }

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
      let numeric = value.replace(/\D/g, '')

      if (!numeric) {
        list[index].price = null
      } else {
        numeric = numeric.replace(/^0+/, '')

        if (!numeric) {
          list[index].price = null
        } else if (numeric.length <= 2) {
          list[index].price = Number('0.' + numeric.padStart(2, '0'))
        } else {
          const integerPart = numeric.slice(0, -2)
          const decimalPart = numeric.slice(-2)
          list[index].price = Number(integerPart + '.' + decimalPart)
        }
      }
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

  /* =======================
   VARIAÇÕES
======================= */

  const addVariationGroup = () => {
    setFormData({
      ...formData,
      variations: [
        ...formData.variations,
        { name: '', options: [] }
      ]
    })
  }

  const updateVariationGroupName = (index: number, value: string) => {
    const list = [...formData.variations]
    list[index].name = value
    setFormData({ ...formData, variations: list })
  }

  const removeVariationGroup = (index: number) => {
    setFormData({
      ...formData,
      variations: formData.variations.filter((_, i) => i !== index)
    })
  }

  const addVariationOption = (groupIndex: number) => {
    const list = [...formData.variations]
    list[groupIndex].options.push({ name: '', price: null })
    setFormData({ ...formData, variations: list })
  }

  const removeVariationOption = (groupIndex: number, optionIndex: number) => {
    const list = [...formData.variations]
    list[groupIndex].options = list[groupIndex].options.filter(
      (_, i) => i !== optionIndex
    )
    setFormData({ ...formData, variations: list })
  }

  const updateVariationOption = (
    groupIndex: number,
    optionIndex: number,
    field: 'name' | 'price',
    value: string
  ) => {
    const list = [...formData.variations]

    if (field === 'price') {
      let numeric = value.replace(/\D/g, '')

      if (!numeric) {
        list[groupIndex].options[optionIndex].price = null
      } else {
        numeric = numeric.replace(/^0+/, '')

        if (!numeric) {
          list[groupIndex].options[optionIndex].price = null
        } else if (numeric.length <= 2) {
          list[groupIndex].options[optionIndex].price =
            Number('0.' + numeric.padStart(2, '0'))
        } else {
          const int = numeric.slice(0, -2)
          const dec = numeric.slice(-2)
          list[groupIndex].options[optionIndex].price =
            Number(int + '.' + dec)
        }
      }
    } else {
      list[groupIndex].options[optionIndex].name = value
    }

    setFormData({ ...formData, variations: list })
  }


  const handlePriceChange = (value: string) => {
    // Remove tudo que não seja número
    let numeric = value.replace(/\D/g, '')

    if (!numeric) {
      setFormData({ ...formData, price: '' })
      return
    }

    let formatted = ''

    if (numeric.length <= 2) {
      // 1 ou 2 dígitos: apenas exibe como número inteiro
      formatted = numeric
    } else {
      // Mais de 2 dígitos: insere vírgula antes dos dois últimos
      const integerPart = numeric.slice(0, -2)
      const decimalPart = numeric.slice(-2)
      formatted = integerPart + ',' + decimalPart
    }

    setFormData({ ...formData, price: formatted })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.categoria_id) {
      showError('Selecione a categoria')
      return
    }

    try {
      let imageUrls = [...formData.image_urls]

      // Upload novas imagens
      for (let i = 0; i < selectedFiles.length; i++) {
        if (selectedFiles[i]) {
          const uploadedUrl = await uploadImage(selectedFiles[i]!)
          if (uploadedUrl) {
            imageUrls[i] = uploadedUrl
          }
        }
      }

      // Filtrar URLs vazias
      const finalImageUrls = imageUrls.filter(url => url && url.trim() !== '')

      const productData = {
        name: formData.name,
        description: formData.description || null,
        price: Number(formData.price.replace(',', '.')),
        categoria_id: formData.categoria_id,
        sub_categoria_id: formData.sub_categoria_id || null,
        show_in_catalog: formData.show_in_catalog,
        image_url: finalImageUrls[0] || null,
        image_urls: finalImageUrls.length ? finalImageUrls : null,
        adicionais: formData.adicionais.length ? formData.adicionais : null,
        sizes: formData.sizes.length ? formData.sizes : null,
        variations: formData.variations.length ? formData.variations : null,
        track_stock: formData.track_stock,
        stock_quantity: formData.track_stock ? Number(formData.stock_quantity) : null,
        updated_at: new Date().toISOString()
      }


      if (editingProduct) {
        // Remover imagens antigas se foram substituídas? 
        // Por simplificação, vamos apenas atualizar. 
        // No mundo ideal, deletaríamos do storage as que saíram.

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

  const handleCategoryFileSelect = (event: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione uma imagem')
      return
    }

    if (type === 'desktop') {
      setCategoryBannerDesktop(file)
      const reader = new FileReader()
      reader.onload = e => setCategoryBannerDesktopPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setCategoryBannerMobile(file)
      const reader = new FileReader()
      reader.onload = e => setCategoryBannerMobilePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.nome.trim()) {
      showError('Nome da categoria é obrigatório')
      return
    }

    try {
      let desktopUrl = categoryFormData.banner_desktop_url
      let mobileUrl = categoryFormData.banner_mobile_url

      if (categoryBannerDesktop) {
        desktopUrl = await uploadImage(categoryBannerDesktop) || desktopUrl
      }
      if (categoryBannerMobile) {
        mobileUrl = await uploadImage(categoryBannerMobile) || mobileUrl
      }

      const categoryData = {
        nome: categoryFormData.nome.trim(),
        banner_desktop_url: desktopUrl,
        banner_mobile_url: mobileUrl,
        updated_at: new Date().toISOString()
      }

      if (editingCategory) {
        const { error } = await supabase
          .from('categorias_produtos')
          .update(categoryData)
          .eq('id', editingCategory.id)

        if (error) throw error
        showSuccess('Categoria atualizada com sucesso!')
      } else {
        const { error } = await supabase
          .from('categorias_produtos')
          .insert({
            ...categoryData,
            user_id: user?.id
          })

        if (error) throw error
        showSuccess('Categoria criada com sucesso!')
      }

      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ nome: '', banner_desktop_url: '', banner_mobile_url: '' })
      setCategoryBannerDesktop(null)
      setCategoryBannerMobile(null)
      setCategoryBannerDesktopPreview(null)
      setCategoryBannerMobilePreview(null)
      fetchCategories()
    } catch (error) {
      console.error('Error saving category:', error)
      showError('Erro ao salvar categoria')
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      nome: category.nome,
      banner_desktop_url: category.banner_desktop_url || '',
      banner_mobile_url: category.banner_mobile_url || ''
    })
    setCategoryBannerDesktopPreview(category.banner_desktop_url || null)
    setCategoryBannerMobilePreview(category.banner_mobile_url || null)
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

  const handleSubCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subCategoryFormData.nome.trim()) {
      showError('Nome da sub-categoria é obrigatório')
      return
    }

    if (!subCategoryFormData.categoria_id) {
      showError('Selecione a categoria pai')
      return
    }

    try {
      if (editingSubCategory) {
        const { error } = await supabase
          .from('subcategorias_produtos')
          .update({
            nome: subCategoryFormData.nome.trim(),
            categoria_id: subCategoryFormData.categoria_id,
          })
          .eq('id', editingSubCategory.id)

        if (error) throw error
        showSuccess('Sub-categoria atualizada!')
      } else {
        const { error } = await supabase
          .from('subcategorias_produtos')
          .insert({
            nome: subCategoryFormData.nome.trim(),
            categoria_id: subCategoryFormData.categoria_id,
            user_id: user?.id
          })

        if (error) throw error
        showSuccess('Sub-categoria criada!')
      }

      setIsSubCategoryDialogOpen(false)
      setEditingSubCategory(null)
      setSubCategoryFormData({ nome: '', categoria_id: '' })
      fetchCategories()
    } catch (error: any) {
      console.error(error)
      showError('Erro ao salvar sub-categoria. Verifique se a tabela existe no banco.')
    }
  }

  const handleEditSubCategory = (sub: Subcategory) => {
    setEditingSubCategory(sub)
    setSubCategoryFormData({
      nome: sub.nome,
      categoria_id: sub.categoria_id
    })
    setIsSubCategoryDialogOpen(true)
  }

  const handleDeleteSubCategory = async (subId: string) => {
    const productsInSub = products.filter(p => p.sub_categoria_id === subId)
    if (productsInSub.length > 0) {
      showError('Não é possível excluir esta sub-categoria pois existem produtos vinculados a ela')
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta sub-categoria?')) return

    try {
      const { error } = await supabase
        .from('subcategorias_produtos')
        .delete()
        .eq('id', subId)

      if (error) throw error
      showSuccess('Sub-categoria excluída!')
      fetchCategories()
    } catch (error) {
      console.error(error)
      showError('Erro ao excluir sub-categoria')
    }
  }



  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoria_id: '',
      sub_categoria_id: '',
      show_in_catalog: true,
      image_url: '',
      image_urls: [] as string[],
      adicionais: [],
      sizes: [],
      variations: [],
      track_stock: false,
      stock_quantity: '0'
    })
    setSelectedFiles([null, null, null])
    setImagePreviews([null, null, null])
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)

    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      categoria_id: product.categoria_id || '',
      sub_categoria_id: product.sub_categoria_id || '',
      show_in_catalog: product.show_in_catalog,
      image_url: product.image_url || '',
      image_urls: product.image_urls || (product.image_url ? [product.image_url] : []),
      adicionais: product.adicionais || [],
      sizes: product.sizes || [],
      variations: product.variations || [],
      track_stock: product.track_stock || false,
      stock_quantity: product.stock_quantity?.toString() || '0'
    })

    const previews = [null, null, null] as (string | null)[]
    const urls = product.image_urls || (product.image_url ? [product.image_url] : [])
    urls.forEach((url, i) => { if (i < 3) previews[i] = url })
    setImagePreviews(previews)
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategoryId === 'all' || p.categoria_id === selectedCategoryId
    const matchesSubCategory = selectedSubCategoryId === 'all' || p.sub_categoria_id === selectedSubCategoryId
    return matchesSearch && matchesCategory && matchesSubCategory
  })

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
            <div className="font-medium text-xs font-bold text-blue-600">
              {row.categorias_produtos?.nome}
              {row.subcategorias_produtos?.nome && (
                <>
                  <span className="mx-1 text-gray-400">/</span>
                  <span className="text-gray-600 font-normal">{row.subcategorias_produtos.nome}</span>
                </>
              )}
            </div>
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
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
                  <DialogTitle>Gerenciar Categorias e Sub-categorias</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="categories" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="categories">Categorias</TabsTrigger>
                    <TabsTrigger value="subcategories">Sub-categorias</TabsTrigger>
                  </TabsList>

                  <TabsContent value="categories" className="space-y-4 pt-4">
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
                        setEditingCategory(null)
                        setCategoryFormData({ nome: '', banner_desktop_url: '', banner_mobile_url: '' })
                        setIsCategoryDialogOpen(true)
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Nova Categoria
                    </Button>
                  </TabsContent>

                  <TabsContent value="subcategories" className="space-y-4 pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sub-categoria</TableHead>
                          <TableHead>Categoria Pai</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subcategories.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                              Nenhuma sub-categoria cadastrada
                            </TableCell>
                          </TableRow>
                        ) : (
                          subcategories.map(sub => (
                            <TableRow key={sub.id}>
                              <TableCell className="font-medium">{sub.nome}</TableCell>
                              <TableCell>
                                {categories.find(c => c.id === sub.categoria_id)?.nome || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditSubCategory(sub)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteSubCategory(sub.id)}
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
                        setEditingSubCategory(null)
                        setSubCategoryFormData({ nome: '', categoria_id: '' })
                        setIsSubCategoryDialogOpen(true)
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Sub-categoria
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>

            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
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
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, nome: e.target.value })}
                      placeholder="Ex: Bolos de Aniversário"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Banner Desktop (1200x300)</Label>
                      <div
                        className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 bg-gray-50/50 overflow-hidden relative"
                        onClick={() => document.getElementById('category-banner-desktop')?.click()}
                      >
                        {categoryBannerDesktopPreview ? (
                          <img src={categoryBannerDesktopPreview} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Desktop</span>
                          </>
                        )}
                      </div>
                      <Input
                        id="category-banner-desktop"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCategoryFileSelect(e, 'desktop')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Banner Mobile (800x300)</Label>
                      <div
                        className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 bg-gray-50/50 overflow-hidden relative"
                        onClick={() => document.getElementById('category-banner-mobile')?.click()}
                      >
                        {categoryBannerMobilePreview ? (
                          <img src={categoryBannerMobilePreview} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Mobile</span>
                          </>
                        )}
                      </div>
                      <Input
                        id="category-banner-mobile"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCategoryFileSelect(e, 'mobile')}
                      />
                    </div>
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

            {/* Diálogo de Sub-categoria */}
            <Dialog open={isSubCategoryDialogOpen} onOpenChange={setIsSubCategoryDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSubCategory ? 'Editar Sub-categoria' : 'Nova Sub-categoria'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sub_category_parent">Categoria Pai *</Label>
                    <Select
                      value={subCategoryFormData.categoria_id}
                      onValueChange={(value) => setSubCategoryFormData({ ...subCategoryFormData, categoria_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria..." />
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
                    <Label htmlFor="sub_category_name">Nome da Sub-categoria *</Label>
                    <Input
                      id="sub_category_name"
                      value={subCategoryFormData.nome}
                      onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, nome: e.target.value })}
                      placeholder="Ex: Recheados, Com Cobertura, etc."
                      required
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit">
                      {editingSubCategory ? 'Atualizar' : 'Criar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSubCategoryDialogOpen(false)}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoria_id">Categoria *</Label>
                      <Select
                        value={formData.categoria_id}
                        onValueChange={(value) => setFormData({ ...formData, categoria_id: value, sub_categoria_id: '' })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
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
                      <Label htmlFor="sub_categoria_id">Sub-categoria</Label>
                      <Select
                        value={formData.sub_categoria_id}
                        onValueChange={(value) => setFormData({ ...formData, sub_categoria_id: value })}
                        disabled={!formData.categoria_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={formData.categoria_id ? "Selecione..." : "Selecione categoria primeiro"} />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategories
                            .filter(sub => sub.categoria_id === formData.categoria_id)
                            .map(sub => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                          type="text"
                          placeholder="Preço (opcional)"
                          value={
                            s.price === null || s.price === undefined
                              ? ''
                              : s.price.toFixed(2).replace('.', ',')
                          }
                          onChange={e => updateSize(i, 'price', e.target.value)}
                          className="w-32"
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
                  {/* Variações */}
                  <div className="space-y-2">
                    <Label>Variações (ex: Cor, Acabamento, Recheio fixo)</Label>

                    {formData.variations.map((group, gIndex) => (
                      <div
                        key={gIndex}
                        className="border rounded-md p-3 space-y-3"
                      >
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nome da variação (ex: Cor)"
                            value={group.name}
                            onChange={e =>
                              updateVariationGroupName(gIndex, e.target.value)
                            }
                          />

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeVariationGroup(gIndex)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {group.options.map((opt, oIndex) => (
                            <div key={oIndex} className="flex gap-2">
                              <Input
                                placeholder="Opção (ex: Preta)"
                                value={opt.name}
                                onChange={e =>
                                  updateVariationOption(
                                    gIndex,
                                    oIndex,
                                    'name',
                                    e.target.value
                                  )
                                }
                              />

                              <Input
                                type="text"
                                placeholder="Preço extra"
                                value={
                                  opt.price === null || opt.price === undefined
                                    ? ''
                                    : opt.price.toFixed(2).replace('.', ',')
                                }
                                onChange={e =>
                                  updateVariationOption(
                                    gIndex,
                                    oIndex,
                                    'price',
                                    e.target.value
                                  )
                                }
                                className="w-32"
                              />

                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  removeVariationOption(gIndex, oIndex)
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addVariationOption(gIndex)}
                            className="w-full"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar opção
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addVariationGroup}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar variação
                    </Button>

                    <p className="text-xs text-muted-foreground">
                      Cada variação pode ter preço adicional (ex: cor preta +10).
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
                            type="text"
                            placeholder="Preço"
                            value={additional.price === 0 ? '' : additional.price.toFixed(2).replace('.', ',')}
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

                  <div className="space-y-4">
                    <Label>Imagens do Produto (Até 3)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((index) => (
                        <div key={index} className="space-y-2">
                          {imagePreviews[index] ? (
                            <div className="relative">
                              <img
                                src={imagePreviews[index]!}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-md border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={() => clearImageMulti(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded-md h-24 flex items-center justify-center">
                              <Label htmlFor={`image-upload-${index}`} className="cursor-pointer flex flex-col items-center">
                                <Plus className="h-6 w-6 text-gray-400" />
                                <span className="text-[10px] text-gray-500">Add</span>
                                <Input
                                  id={`image-upload-${index}`}
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileSelectMulti(e, index)}
                                  className="hidden"
                                />
                              </Label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      A primeira imagem será a principal.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show_in_catalog"
                      checked={formData.show_in_catalog}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_in_catalog: checked })}
                    />
                    <Label htmlFor="show_in_catalog">Mostrar no catálogo</Label>
                  </div>

                  <div className="space-y-4 pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="track_stock"
                        checked={formData.track_stock}
                        onCheckedChange={(checked) => setFormData({ ...formData, track_stock: checked })}
                      />
                      <Label htmlFor="track_stock">Controlar estoque deste produto</Label>
                    </div>

                    {formData.track_stock && (
                      <div className="space-y-2 pl-7">
                        <Label htmlFor="stock_quantity">Quantidade em estoque</Label>
                        <Input
                          id="stock_quantity"
                          type="number"
                          min="0"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                          placeholder="0"
                          className="w-32"
                        />
                      </div>
                    )}
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
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <Select
                  value={selectedCategoryId}
                  onValueChange={(value) => {
                    setSelectedCategoryId(value)
                    setSelectedSubCategoryId('all')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-64">
                <Select
                  value={selectedSubCategoryId}
                  onValueChange={setSelectedSubCategoryId}
                  disabled={selectedCategoryId === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCategoryId === 'all' ? "Sub-categoria" : "Filtrar por sub-categoria"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as sub-categorias</SelectItem>
                    {subcategories
                      .filter(sub => sub.categoria_id === selectedCategoryId)
                      .map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
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
