import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  AlertTriangle,
  Eye,
  X,
  LayoutGrid,
  List
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess } from '@/utils/toast'

/* ... interfaces iguais aos seus ... */

const CatalogoPublico = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [bakerySettings, setBakerySettings] = useState<BakerySettings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)

  const [selectedAdditionais, setSelectedAdditionais] = useState<Record<string, boolean>>({})
  const [quantity, setQuantity] = useState(1)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  /* todo o seu código de effects e funções permanece igual */

  /* ======================== */
  /* A PARTIR DO JSX SÓ MUDA: */
  /* ======================== */

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ... seu header permanece igual ... */}

      {/* Barra de categorias + modo de visualização */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm z-40 py-2 border-b">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-3">
          <Select onValueChange={handleCategorySelect}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Navegar por categorias..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant={viewMode === 'list' ? 'default' : 'outline'}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid / Lista de produtos */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        {categories.map(category => (
          <div
            key={category.id}
            id={category.id}
            ref={el => (categoryRefs.current[category.id] = el)}
            className="mb-6 pt-8 -mt-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-3 border-b pb-1">
              {category.nome}
            </h2>

            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-3'
              }
            >
              {category.products.map(product => (
                <Card
                  key={product.id}
                  className={
                    viewMode === 'grid'
                      ? 'overflow-hidden hover:shadow-lg transition-shadow flex flex-col'
                      : 'overflow-hidden hover:shadow-md transition-shadow'
                  }
                >
                  <div className={viewMode === 'grid' ? '' : 'flex gap-3 p-3'}>
                    {/* imagem */}
                    <div
                      className={
                        viewMode === 'grid'
                          ? 'aspect-square relative bg-gray-100'
                          : 'relative bg-gray-100 w-28 h-28 flex-shrink-0 rounded-md overflow-hidden'
                      }
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={e => {
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                      ) : null}

                      <div
                        className={`absolute inset-0 flex items-center justify-center ${
                          product.image_url ? 'hidden' : ''
                        }`}
                      >
                        <ImageIcon className="w-10 h-10 text-gray-400" />
                      </div>
                    </div>

                    <CardContent
                      className={
                        viewMode === 'grid'
                          ? 'p-3 flex flex-col flex-grow'
                          : 'p-0 flex flex-col flex-1'
                      }
                    >
                      <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-2">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2 flex-grow">
                          {product.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-auto">
                        <Badge
                          variant="secondary"
                          className="text-sm font-bold text-green-700 bg-green-100"
                        >
                          {formatPrice(product.price)}
                        </Badge>

                        <Button
                          size="sm"
                          onClick={() => openProductModal(product)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Visualizar
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ... todo o resto do seu arquivo permanece exatamente igual ... */}

    </div>
  )
}

export default CatalogoPublico
