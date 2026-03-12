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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Upload, X, Image as ImageIcon, Tag, List, Layers, Package, Printer, FileText, AlertCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showSuccess, showError } from '@/utils/toast'
import { optimizeImage } from '@/utils/image-optimization'
import { getBusinessConfig } from '@/utils/business-types'
import { calculateIngredientCost } from '@/utils/unit-conversion'

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

interface VariantStock {
  variation_key: string
  quantity: number
}

interface RecipeItem {
  stock_item_id?: string
  base_recipe_id?: string
  quantity: number
  unit: string
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
  variant_stock?: VariantStock[]
  recipe?: RecipeItem[]
  recipe_yield?: number
  operational_cost_percent?: number
}

interface StockItem {
  id: string
  name: string
  unit: string
  cost_per_unit: number
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
  const [isRecipeMode, setIsRecipeMode] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<(File | null)[]>([])
  const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([])
  const [isBulkCategory, setIsBulkCategory] = useState(false)
  const [isBulkSubCategory, setIsBulkSubCategory] = useState(false)
  const [bulkNames, setBulkNames] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>('all')
  const [businessType, setBusinessType] = useState<string>('')
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [viewTab, setViewTab] = useState<'products' | 'recipes'>('products')

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
    stock_quantity: '0',
    variant_stock: [] as VariantStock[],
    recipe: [] as RecipeItem[],
    recipe_yield: '1',
    operational_cost_percent: '10'
  })

  const [shopSettings, setShopSettings] = useState<any>(null)

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
    fetchStockItems()
    fetchShopSettings()
  }, [])

  const fetchStockItems = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id, name, unit, cost_per_unit')
        .eq('user_id', user?.id)
        .order('name')

      if (error) throw error
      setStockItems(data || [])
    } catch (error) {
      console.error('Error fetching stock items:', error)
    }
  }

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

  const fetchShopSettings = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('bakery_settings')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setShopSettings(data)
        setBusinessType(data.business_type || '')
      }
    } catch (err) {
      console.error('Error fetching shop settings:', err)
    }
  }

  const importRecipe = (sourceProductId: string) => {
    const source = products.find(p => p.id === sourceProductId)
    if (source) {
      setFormData(prev => ({
        ...prev,
        recipe: [
          ...prev.recipe,
          {
            base_recipe_id: source.id,
            quantity: 1,
            unit: 'unid'
          }
        ]
      }))
      showSuccess(`Base "${source.name}" importada.`)
    }
  }

  const printProductionRecipe = async (product: Partial<Product>) => {
    const isEditMode = !!editingProduct
    const currentRecipe = isEditMode ? formData.recipe : product.recipe
    const currentYield = isEditMode ? formData.recipe_yield : (product.recipe_yield || 1)

    if (!currentRecipe || currentRecipe.length === 0) {
      showError('Este produto não possui uma receita cadastrada.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const recipeHtml = `
      <html>
      <head>
        <title>Ficha de Produção - ${product.name}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { max-width: 80px; margin-bottom: 10px; border-radius: 50%; border: 2px solid #f1f5f9; }
          h1 { margin: 0; color: #e67e22; font-size: 28px; }
          .yield { font-style: italic; color: #64748b; margin-top: 5px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; border-radius: 8px; overflow: hidden; }
          th, td { border: 1px solid #f1f5f9; padding: 14px; text-align: left; }
          th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 12px; }
          .steps { margin-top: 35px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          .steps h3 { color: #1e293b; margin-bottom: 15px; }
          .steps p { color: #475569; white-space: pre-wrap; background: #f8fafc; padding: 20px; border-radius: 8px; }
          .footer { margin-top: 60px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          @media print {
            .no-print { display: none; }
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${shopSettings?.logo_url ? `<img src="${shopSettings.logo_url}" class="logo">` : ''}
          <h1>${product.name}</h1>
          <div class="yield">📦 Rendimento de Referência: ${currentYield}</div>
        </div>
        
        <h3>🥣 Ingredientes Disponíveis</h3>
        <table>
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Quantidade</th>
              <th>Unidade</th>
            </tr>
          </thead>
          <tbody>
            ${currentRecipe.map((item: any) => {
      const stockItem = stockItems.find(si => si.id === item.stock_item_id)
      return `
                <tr>
                  <td style="font-weight: 500; color: #1e293b;">${stockItem?.name || 'Item'}</td>
                  <td style="color: #64748b;">${item.quantity}</td>
                  <td style="color: #64748b;">${item.unit}</td>
                </tr>
              `
    }).join('')}
          </tbody>
        </table>

        ${product.description || formData.description ? `
          <div class="steps">
            <h3>📝 Modo de Preparo / Observações</h3>
            <p>${(isEditMode ? formData.description : product.description).replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}

        <div class="footer">
          Ficha Técnica produzida por <strong>${shopSettings?.bakery_name || 'Cataloguei'}</strong> em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </div>
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
      </html>
    `

    printWindow.document.write(recipeHtml)
    printWindow.document.close()
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

  const handleFileSelectMulti = async (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione uma imagem')
      return
    }

    setUploading(true)
    try {
      const optimized = await optimizeImage(file, 1080, 1080, 0.8)

      const reader = new FileReader()
      reader.onload = e => {
        const previewUrl = e.target?.result as string

        setImagePreviews(prev => {
          const newPreviews = [...prev]
          if (index >= newPreviews.length) {
            newPreviews.push(previewUrl)
          } else {
            newPreviews[index] = previewUrl
          }
          return newPreviews
        })

        setSelectedFiles(prev => {
          const newFiles = [...prev]
          if (index >= newFiles.length) {
            newFiles.push(optimized)
          } else {
            newFiles[index] = optimized
          }
          return newFiles
        })
      }
      reader.readAsDataURL(optimized)
    } catch (err) {
      showError('Erro ao processar imagem')
    } finally {
      setUploading(false)
    }
  }

  const clearImageMulti = (index: number) => {
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    setSelectedFiles(newFiles)

    const newPreviews = [...imagePreviews]
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)

    const newUrls = [...formData.image_urls]
    newUrls.splice(index, 1)
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

  const generateVariantCombinations = () => {
    const hasSizes = formData.sizes.length > 0;
    const hasVariations = formData.variations.length > 0;

    if (!hasSizes && !hasVariations) return [];

    let combinations: string[] = [];

    if (hasSizes) {
      combinations = formData.sizes.map(s => s.name);
    }

    if (hasVariations) {
      formData.variations.forEach(group => {
        const options = group.options.map(o => o.name);
        if (combinations.length === 0) {
          combinations = options;
        } else {
          const newCombinations: string[] = [];
          combinations.forEach(combo => {
            options.forEach(opt => {
              newCombinations.push(`${combo} - ${opt}`);
            });
          });
          combinations = newCombinations;
        }
      });
    }

    return combinations;
  };

  const syncVariantStock = () => {
    const combinations = generateVariantCombinations();
    const currentVariants = [...formData.variant_stock];

    const newVariantStock = combinations.map(key => {
      const existing = currentVariants.find(v => v.variation_key === key);
      return {
        variation_key: key,
        quantity: existing ? existing.quantity : 0
      };
    });

    setFormData(prev => ({ ...prev, variant_stock: newVariantStock }));
  };

  const updateVariantQuantity = (key: string, quantity: number) => {
    const newList = formData.variant_stock.map(v =>
      v.variation_key === key ? { ...v, quantity } : v
    );
    setFormData({ ...formData, variant_stock: newList });
  }

  /* =======================
     RECEITA (CONFEITARIA)
  ======================= */

  const addRecipeItem = () => {
    setFormData({
      ...formData,
      recipe: [
        ...formData.recipe,
        { stock_item_id: '', quantity: 0, unit: '' }
      ]
    })
  }

  const removeRecipeItem = (index: number) => {
    setFormData({
      ...formData,
      recipe: formData.recipe.filter((_, i) => i !== index)
    })
  }

  const getProductUnitCost = (productOrFormData: any): number => {
    const recipe = productOrFormData.recipe as RecipeItem[] || []
    const yieldVal = parseFloat(productOrFormData.recipe_yield) || 1
    const opPercent = parseFloat(productOrFormData.operational_cost_percent) || 0

    let totalIngCost = 0
    recipe.forEach(item => {
      if (item.stock_item_id) {
        const stockItem = stockItems.find(si => si.id === item.stock_item_id)
        if (stockItem) {
          totalIngCost += calculateIngredientCost(item.quantity, item.unit, stockItem.cost_per_unit, stockItem.unit)
        }
      } else if (item.base_recipe_id) {
        const base = products.find(p => p.id === item.base_recipe_id)
        if (base) {
          const baseUnitCost = getProductUnitCost(base)
          totalIngCost += baseUnitCost * item.quantity
        }
      }
    })

    const operational = totalIngCost * (opPercent / 100)
    return (totalIngCost + operational) / yieldVal
  }

  const updateRecipeItem = (index: number, field: keyof RecipeItem, value: any) => {
    const list = [...formData.recipe]
    const updatedItem = { ...list[index], [field]: value }

    // Se selecionou o ingrediente, tenta puxar a unidade padrão dele
    if (field === 'stock_item_id') {
      const item = stockItems.find(i => i.id === value)
      if (item) {
        updatedItem.unit = item.unit
        delete updatedItem.base_recipe_id
      }
    } else if (field === 'base_recipe_id') {
      const base = products.find(i => i.id === value)
      if (base) {
        updatedItem.unit = 'unid'
        delete updatedItem.stock_item_id
      }
    }

    list[index] = updatedItem
    setFormData({ ...formData, recipe: list })
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
        stock_quantity: formData.track_stock ? (formData.variant_stock.length > 0 ? formData.variant_stock.reduce((acc, v) => acc + v.quantity, 0) : Number(formData.stock_quantity)) : null,
        variant_stock: formData.track_stock && formData.variant_stock.length > 0 ? formData.variant_stock : null,
        recipe: formData.recipe.length ? formData.recipe : null,
        recipe_yield: formData.recipe.length ? Number(formData.recipe_yield) : null,
        operational_cost_percent: formData.recipe.length ? Number(formData.operational_cost_percent) : null,
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

  const handleCategoryFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, type: 'desktop' | 'mobile') => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione uma imagem')
      return
    }

    setUploading(true)
    try {
      const maxWidth = type === 'desktop' ? 1920 : 1080
      const maxHeight = type === 'desktop' ? 1080 : 1920
      const optimized = await optimizeImage(file, maxWidth, maxHeight, 0.8)

      if (type === 'desktop') {
        setCategoryBannerDesktop(optimized)
        const reader = new FileReader()
        reader.onload = e => setCategoryBannerDesktopPreview(e.target?.result as string)
        reader.readAsDataURL(optimized)
      } else {
        setCategoryBannerMobile(optimized)
        const reader = new FileReader()
        reader.onload = e => setCategoryBannerMobilePreview(e.target?.result as string)
        reader.readAsDataURL(optimized)
      }
    } catch (err) {
      showError('Erro ao processar imagem')
    } finally {
      setUploading(false)
    }
  }

  const clearCategoryBanner = (type: 'desktop' | 'mobile') => {
    if (type === 'desktop') {
      setCategoryBannerDesktop(null)
      setCategoryBannerDesktopPreview(null)
      setCategoryFormData(prev => ({ ...prev, banner_desktop_url: '' }))
    } else {
      setCategoryBannerMobile(null)
      setCategoryBannerMobilePreview(null)
      setCategoryFormData(prev => ({ ...prev, banner_mobile_url: '' }))
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.nome.trim()) {
      showError('Nome da categoria é obrigatório')
      return
    }

    try {
      if (isBulkCategory && !editingCategory) {
        const names = categoryFormData.nome
          .split(/[,\n]/)
          .map(n => n.trim())
          .filter(n => n !== '')

        if (names.length === 0) {
          showError('Insira ao menos um nome para cadastro em massa')
          return
        }

        const categoryDataList = names.map(name => ({
          nome: name,
          user_id: user?.id,
          updated_at: new Date().toISOString()
        }))

        const { error } = await supabase
          .from('categorias_produtos')
          .insert(categoryDataList)

        if (error) throw error
        showSuccess(`${names.length} categorias criadas com sucesso!`)
      } else {
        // Lógica original para cadastro único (permite banners)
        let desktopUrl = categoryBannerDesktopPreview ? categoryFormData.banner_desktop_url : null
        let mobileUrl = categoryBannerMobilePreview ? categoryFormData.banner_mobile_url : null

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
      }

      setIsCategoryDialogOpen(false)
      setEditingCategory(null)
      setIsBulkCategory(false)
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
      if (isBulkSubCategory && !editingSubCategory) {
        const names = subCategoryFormData.nome
          .split(/[,\n]/)
          .map(n => n.trim())
          .filter(n => n !== '')

        if (names.length === 0) {
          showError('Insira ao menos um nome')
          return
        }

        const subDataList = names.map(name => ({
          nome: name,
          categoria_id: subCategoryFormData.categoria_id,
          user_id: user?.id
        }))

        const { error } = await supabase
          .from('subcategorias_produtos')
          .insert(subDataList)

        if (error) throw error
        showSuccess(`${names.length} sub-categorias criadas!`)
      } else {
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
      }

      setIsSubCategoryDialogOpen(false)
      setEditingSubCategory(null)
      setIsBulkSubCategory(false)
      setSubCategoryFormData({ nome: '', categoria_id: '' })
      fetchCategories()
    } catch (error: any) {
      console.error(error)
      showError('Erro ao salvar')
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
      stock_quantity: '0',
      variant_stock: [],
      recipe: [] as RecipeItem[],
      recipe_yield: '1',
      operational_cost_percent: '10'
    })
    setSelectedFiles([])
    setImagePreviews([])
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
      stock_quantity: product.stock_quantity?.toString() || '0',
      variant_stock: product.variant_stock || [],
      recipe: product.recipe || [],
      recipe_yield: product.recipe_yield?.toString() || '1',
      operational_cost_percent: product.operational_cost_percent?.toString() || '10'
    })

    const urls = product.image_urls || (product.image_url ? [product.image_url] : [])
    setImagePreviews([...urls])
    setSelectedFiles(new Array(urls.length).fill(null))
    setIsRecipeMode(product.categorias_produtos?.nome?.toLowerCase() === 'receita')
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
    // Se for aba de produtos, não mostrar o que tem categoria "Receita" (independente de estar no catálogo ou não)
    const categoryName = p.categorias_produtos?.nome?.toLowerCase() || ''
    const isActuallyRecipe = categoryName === 'receita'

    if (viewTab === 'products' && isActuallyRecipe) return false
    if (viewTab === 'recipes' && !isActuallyRecipe) return false

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

            {!row.show_in_catalog && (
              <Badge variant="secondary" className={`mt-1 text-[10px] ${row.categorias_produtos?.nome?.toLowerCase() === 'receita' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {row.categorias_produtos?.nome?.toLowerCase() === 'receita' ? (
                  <>
                    <FileText className="w-3 h-3 mr-1" />
                    Base de Receita
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3 mr-1" />
                    Oculto no Catálogo
                  </>
                )}
              </Badge>
            )}

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
      key: 'profit_margin',
      label: 'Margem %',
      hideOnMobile: true,
      render: (_: any, row: Product) => {
        if (businessType !== 'confeitaria') return null

        const unitCost = getProductUnitCost(row)
        const sellingPrice = row.price || 0

        if (unitCost <= 0 || sellingPrice <= 0) return '-'

        const profit = sellingPrice - unitCost
        const margin = (profit / sellingPrice) * 100

        return (
          <Badge
            variant={margin < 30 ? 'destructive' : 'secondary'}
            className={`px-2 py-0.5 rounded-full ${margin >= 30 ? 'bg-green-100 text-green-800 border-green-200' : 'animate-pulse'}`}
          >
            {margin < 30 && <AlertCircle className="w-3 h-3 mr-1" />}
            {margin.toFixed(0)}%
          </Badge>
        )
      }
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

  const businessConfig = getBusinessConfig(businessType)

  return (

    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              {businessType === 'confeitaria' ? 'Gerenciamento' : 'Produtos'}
            </h1>
            {businessType === 'confeitaria' && (
              <Tabs value={viewTab} onValueChange={(val: any) => setViewTab(val)} className="w-auto">
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="products">Lista de Produtos</TabsTrigger>
                  <TabsTrigger value="recipes">Lista de Receitas</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setIsCategoriesListOpen(true)}
              className="w-full sm:w-auto"
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
                    <div className="flex justify-between items-center">
                      <Label htmlFor="category_name">
                        {isBulkCategory ? 'Nomes das Categorias (uma por linha ou separadas por vírgula)' : 'Nome da Categoria *'}
                      </Label>
                      {!editingCategory && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-6"
                          onClick={() => setIsBulkCategory(!isBulkCategory)}
                        >
                          {isBulkCategory ? 'Cadastrar Único' : 'Cadastrar em Massa'}
                        </Button>
                      )}
                    </div>
                    {isBulkCategory ? (
                      <Textarea
                        id="category_name"
                        value={categoryFormData.nome}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, nome: e.target.value })}
                        placeholder="Categoria 1, Categoria 2..."
                        rows={5}
                        required
                      />
                    ) : (
                      <Input
                        id="category_name"
                        value={categoryFormData.nome}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, nome: e.target.value })}
                        placeholder="Ex: Bolos de Aniversário"
                        required
                      />
                    )}
                  </div>

                  {!isBulkCategory && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                      <div className="space-y-2">
                        <Label>Banner Desktop (1200x300)</Label>
                        <div
                          className="border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 bg-gray-50/50 overflow-hidden relative"
                          onClick={() => document.getElementById('category-banner-desktop')?.click()}
                        >
                          {categoryBannerDesktopPreview ? (
                            <div className="relative w-full h-full group">
                              <img src={categoryBannerDesktopPreview} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearCategoryBanner('desktop');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
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
                            <div className="relative w-full h-full group">
                              <img src={categoryBannerMobilePreview} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="h-8 w-8 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearCategoryBanner('mobile');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
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
                  )}

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
                    <div className="flex justify-between items-center">
                      <Label htmlFor="sub_category_name">
                        {isBulkSubCategory ? 'Nomes das Sub-categorias (uma por linha ou vírgula)' : 'Nome da Sub-categoria *'}
                      </Label>
                      {!editingSubCategory && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-6"
                          onClick={() => setIsBulkSubCategory(!isBulkSubCategory)}
                        >
                          {isBulkSubCategory ? 'Cadastrar Único' : 'Cadastrar em Massa'}
                        </Button>
                      )}
                    </div>
                    {isBulkSubCategory ? (
                      <Textarea
                        id="sub_category_name"
                        value={subCategoryFormData.nome}
                        onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, nome: e.target.value })}
                        placeholder="Opção 1, Opção 2..."
                        rows={5}
                        required
                      />
                    ) : (
                      <Input
                        id="sub_category_name"
                        value={subCategoryFormData.nome}
                        onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, nome: e.target.value })}
                        placeholder="Ex: Recheados, Com Cobertura, etc."
                        required
                      />
                    )}
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
            {businessType === 'confeitaria' && (
              <Button
                variant="outline"
                onClick={async () => {
                  resetForm()
                  setEditingProduct(null)
                  setIsRecipeMode(true)

                  // Buscar ou criar categoria "Receita"
                  let recipeCat = categories.find(c => c.nome.toLowerCase() === 'receita')
                  if (!recipeCat) {
                    try {
                      const { data, error } = await supabase
                        .from('categorias_produtos')
                        .insert({ nome: 'Receita', user_id: (await supabase.auth.getUser()).data.user?.id })
                        .select()
                        .single()

                      if (data) {
                        setCategories(prev => [...prev, data])
                        recipeCat = data
                      }
                    } catch (err) {
                      console.error('Erro ao criar categoria Receita:', err)
                    }
                  }

                  setFormData(prev => ({
                    ...prev,
                    show_in_catalog: false,
                    price: '0',
                    categoria_id: recipeCat?.id || ''
                  }))
                  setIsDialogOpen(true)
                }}
                className="w-full sm:w-auto border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <Package className="w-4 h-4 mr-2" />
                Nova Receita
              </Button>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    resetForm()
                    setEditingProduct(null)
                    setIsRecipeMode(false)
                  }}
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {isRecipeMode ? 'Nova Receita Base' : (editingProduct ? 'Editar Produto' : 'Novo Produto')}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={businessConfig.productNamePlaceholder}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoria_id">Categoria *</Label>
                      <Select
                        value={formData.categoria_id}
                        onValueChange={(value) => setFormData({ ...formData, categoria_id: value, sub_categoria_id: '' })}
                        required
                      >
                        <SelectTrigger disabled={isRecipeMode}>
                          <SelectValue placeholder={isRecipeMode ? "Receita" : "Selecione..."} />
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
                        <SelectTrigger disabled={!formData.categoria_id}>
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

                  {!isRecipeMode && (
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
                  )}
                  {!isRecipeMode && (
                    <>
                      {/* Tamanhos */}
                      <div className="space-y-2">
                        <Label>{businessConfig.sizeLabel}</Label>

                        {formData.sizes.map((s, i) => (
                          <div key={i} className="flex flex-col sm:flex-row gap-2 border-b sm:border-b-0 pb-3 sm:pb-0">
                            <Input
                              placeholder={businessConfig.sizePlaceholder}
                              value={s.name}
                              onChange={e => updateSize(i, 'name', e.target.value)}
                              className="flex-1"
                            />

                            <div className="flex gap-2 w-full sm:w-auto">
                              <Input
                                type="text"
                                placeholder="Preço (opcional)"
                                value={
                                  s.price === null || s.price === undefined
                                    ? ''
                                    : s.price.toFixed(2).replace('.', ',')
                                }
                                onChange={e => updateSize(i, 'price', e.target.value)}
                                className="w-full sm:w-32"
                              />
                              <Button type="button" variant="outline" onClick={() => removeSize(i)} className="shrink-0">
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}

                        <Button type="button" variant="outline" onClick={addSize} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar {businessConfig.sizeLabel.toLowerCase()}
                        </Button>

                        <p className="text-xs text-muted-foreground">
                          Se o preço ficar vazio, será usado o preço base.
                        </p>
                      </div>

                      {/* Variações */}
                      <div className="space-y-2">
                        <Label>{businessConfig.variationLabel}</Label>

                        {formData.variations.map((group, gIndex) => (
                          <div
                            key={gIndex}
                            className="border rounded-md p-3 space-y-3"
                          >
                            <div className="flex gap-2">
                              <Input
                                placeholder={businessConfig.variationPlaceholder}
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
                                <div key={oIndex} className="flex flex-col sm:flex-row gap-2 border-b sm:border-b-0 pb-2 sm:pb-0">
                                  <Input
                                    placeholder={businessConfig.variationOptionPlaceholder}
                                    value={opt.name}
                                    onChange={e =>
                                      updateVariationOption(
                                        gIndex,
                                        oIndex,
                                        'name',
                                        e.target.value
                                      )
                                    }
                                    className="flex-1"
                                  />

                                  <div className="flex gap-2 w-full sm:w-32">
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
                                      className="flex-1 sm:w-32 text-xs"
                                    />

                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() =>
                                        removeVariationOption(gIndex, oIndex)
                                      }
                                      className="shrink-0"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
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
                    </>
                  )}

                  {/* Receita (Visível apenas para Confeitaria) */}
                  {businessType === 'confeitaria' && (
                    <div className="space-y-2 p-4 bg-orange-50/20 rounded-xl border border-orange-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-orange-700 font-bold flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Receita (Ficha Técnica / Custos)
                        </Label>
                      </div>

                      <div className="space-y-3">
                        {formData.recipe.map((item, index) => {
                          const isBase = !!item.base_recipe_id
                          return (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end bg-white/50 p-2 rounded-lg border border-orange-50">
                              <div className="col-span-12 sm:col-span-5 space-y-1">
                                <Label className="text-[10px] uppercase text-orange-600 font-bold italic">
                                  {isBase ? 'Base Importada' : 'Ingrediente'}
                                </Label>
                                <Select
                                  value={isBase ? item.base_recipe_id : item.stock_item_id}
                                  onValueChange={(val) => updateRecipeItem(index, isBase ? 'base_recipe_id' : 'stock_item_id', val)}
                                >
                                  <SelectTrigger className="bg-white h-9">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isBase ? (
                                      products.filter(p => (p.recipe?.length || 0) > 0).map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                          {p.name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      stockItems.length > 0 ? (
                                        stockItems.map(stockItem => (
                                          <SelectItem key={stockItem.id} value={stockItem.id}>
                                            {stockItem.name} ({stockItem.unit})
                                          </SelectItem>
                                        ))
                                      ) : (
                                        <div className="p-2 text-xs text-center text-muted-foreground">
                                          Nenhum ingrediente no estoque
                                        </div>
                                      )
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="col-span-6 sm:col-span-2 space-y-1">
                                <Label className="text-[10px] uppercase text-orange-600 font-bold italic">Quantidade</Label>
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={item.quantity || ''}
                                  onChange={(e) => updateRecipeItem(index, 'quantity', parseFloat(e.target.value))}
                                  className="bg-white h-9"
                                />
                              </div>

                              <div className="col-span-6 sm:col-span-2 space-y-1">
                                <Label className="text-[10px] uppercase text-orange-600 font-bold italic">Unid.</Label>
                                <Input
                                  value={item.unit}
                                  onChange={(e) => updateRecipeItem(index, 'unit', e.target.value)}
                                  placeholder="g, ml..."
                                  className="bg-white h-9"
                                  disabled={isBase}
                                />
                              </div>

                              <div className="col-span-10 sm:col-span-2 space-y-1">
                                <Label className="text-[10px] uppercase text-orange-600 font-bold italic">Custo Item</Label>
                                <div className="h-9 flex items-center px-2 bg-orange-100/30 border border-orange-100 rounded-md text-[11px] font-bold text-orange-800 whitespace-nowrap overflow-hidden">
                                  {(() => {
                                    if (item.stock_item_id) {
                                      const si = stockItems.find(s => s.id === item.stock_item_id)
                                      if (si) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateIngredientCost(item.quantity, item.unit, si.cost_per_unit, si.unit))
                                    } else if (item.base_recipe_id) {
                                      const base = products.find(p => p.id === item.base_recipe_id)
                                      if (base) {
                                        const cost = getProductUnitCost(base) * (item.quantity || 0)
                                        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cost)
                                      }
                                    }
                                    return 'R$ 0,00'
                                  })()}
                                </div>
                              </div>

                              <div className="col-span-2 sm:col-span-1 pb-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRecipeItem(index)}
                                  className="text-orange-400 hover:text-red-500 hover:bg-red-50 h-9 w-9"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addRecipeItem}
                            className="w-full border-dashed border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 h-auto py-2 whitespace-normal text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Novo Item
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => printProductionRecipe(editingProduct || {})}
                            className="w-full border-orange-200 text-orange-700 hover:bg-orange-50 h-auto py-2 whitespace-normal text-xs"
                          >
                            <Printer className="w-3 h-3 mr-1" />
                            Imprimir Ficha
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 h-auto py-2 whitespace-normal text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Importar Base
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="max-h-60 overflow-y-auto">
                              {products.filter(p => p.recipe && p.recipe.length > 0 && p.id !== editingProduct?.id).length === 0 ? (
                                <DropdownMenuItem disabled>Nenhuma receita encontrada</DropdownMenuItem>
                              ) : (
                                products.filter(p => p.recipe && p.recipe.length > 0 && p.id !== editingProduct?.id).map(p => (
                                  <DropdownMenuItem key={p.id} onClick={() => importRecipe(p.id)}>
                                    {p.name}
                                  </DropdownMenuItem>
                                ))
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-orange-600 font-bold italic">Rendimento (ex: 1 bolo, 50 un)</Label>
                            <Input
                              type="number"
                              value={formData.recipe_yield}
                              onChange={(e) => setFormData({ ...formData, recipe_yield: e.target.value })}
                              placeholder="Ex: 1"
                              className="bg-white h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-orange-600 font-bold italic">Custo Operacional % (Gás, luz...)</Label>
                            <Input
                              type="number"
                              value={formData.operational_cost_percent}
                              onChange={(e) => setFormData({ ...formData, operational_cost_percent: e.target.value })}
                              placeholder="Ex: 10"
                              className="bg-white h-9"
                            />
                          </div>
                        </div>

                        {formData.recipe.length > 0 && stockItems.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="p-4 bg-white rounded-xl border border-orange-100 shadow-sm space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Custo Total Receita</span>
                                  <span className="text-lg font-bold text-orange-700">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                      getProductUnitCost(formData) * (parseFloat(formData.recipe_yield) || 1)
                                    )}
                                  </span>
                                  <span className="text-[9px] text-gray-400 block">+ {formData.operational_cost_percent}% operacional</span>
                                </div>
                                <div className="space-y-1 text-right">
                                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Custo Unitário</span>
                                  <span className="text-lg font-bold text-orange-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                      getProductUnitCost(formData)
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-orange-50 grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Lucro p/ Unid. Real</span>
                                  <div className="text-lg font-bold text-green-600">
                                    {(() => {
                                      const unitCost = getProductUnitCost(formData)
                                      const price = Number(formData.price.replace(',', '.')) || 0
                                      const profit = price - unitCost
                                      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)
                                    })()}
                                  </div>
                                </div>
                                <div className="space-y-1 text-right">
                                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Margem Real %</span>
                                  <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-sm font-bold border border-green-100">
                                    {(() => {
                                      const unitCost = getProductUnitCost(formData)
                                      const price = Number(formData.price.replace(',', '.')) || 0

                                      if (price <= 0) return '0%'
                                      const margin = ((price - unitCost) / price) * 100
                                      return `${margin.toFixed(1)}%`
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <p className="text-[10px] text-gray-500 italic text-center">
                              * Agora incluindo custos operacionais estimados (gás, luz, mão de obra).
                            </p>
                          </div>
                        )}

                        {stockItems.length === 0 && (
                          <p className="text-[10px] text-center text-orange-400 bg-orange-50 p-2 rounded">
                            Cadastre seus ingredientes no menu <strong>Estoque</strong> para gerenciar receitas e custos.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Seção de Adicionais */}
                  {!isRecipeMode && (
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
                  )}

                  {!isRecipeMode && (
                    <div className="space-y-4">
                      <Label>Imagens do Produto</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {imagePreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square">
                            <img
                              src={preview!}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover rounded-md border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                              onClick={() => clearImageMulti(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {/* Botão de adicionar nova imagem */}
                        <div className="aspect-square">
                          <div className="border-2 border-dashed border-gray-300 rounded-md h-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                            <Label htmlFor="image-upload-new" className="cursor-pointer flex flex-col items-center w-full h-full justify-center">
                              <Plus className="h-8 w-8 text-gray-400" />
                              <span className="text-xs text-gray-500 mt-2">Adicionar</span>
                              <Input
                                id="image-upload-new"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  const currentLength = imagePreviews.length;
                                  files.forEach((file, i) => {
                                    const mockEvent = {
                                      target: { files: [file] }
                                    } as any;
                                    handleFileSelectMulti(mockEvent, currentLength + i);
                                  });
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </Label>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        A primeira imagem será a principal.
                      </p>
                    </div>
                  )}

                  {!isRecipeMode && (
                    <>
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
                          <div className="space-y-4 pl-7">
                            {(formData.sizes.length > 0 || formData.variations.length > 0) ? (
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <Label className="text-sm font-semibold">Estoque por Variante</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={syncVariantStock}
                                    className="h-8 text-xs"
                                  >
                                    Gerar/Sincronizar Grade
                                  </Button>
                                </div>
                                <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                                  {formData.variant_stock.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                      Clique em "Gerar Grade" para definir o estoque de cada combinação.
                                    </p>
                                  ) : (
                                    formData.variant_stock.map((v) => (
                                      <div key={v.variation_key} className="flex justify-between items-center gap-4 bg-muted/30 p-2 rounded-sm">
                                        <span className="text-xs font-medium">{v.variation_key}</span>
                                        <Input
                                          type="number"
                                          min="0"
                                          className="w-20 h-8 text-right"
                                          value={v.quantity}
                                          onChange={(e) => updateVariantQuantity(v.variation_key, Number(e.target.value))}
                                        />
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
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
                        )}
                      </div>
                    </>
                  )}



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
