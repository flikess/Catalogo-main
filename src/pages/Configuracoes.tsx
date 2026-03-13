import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Store, User, MapPin, Phone, FileText, Upload, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showSuccess, showError } from '@/utils/toast'
import { optimizeImage } from '@/utils/image-optimization'
import { BUSINESS_TYPES } from '@/utils/business-types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface BakerySettings {
  id?: string
  bakery_name?: string
  email?: string
  cpf_cnpj?: string
  phone?: string
  address_state?: string
  address_city?: string
  address_neighborhood?: string
  address_street?: string
  address_number?: string
  logo_url?: string | null
  banner_url?: string | null
  banner_mobile_url?: string | null
  banner_position?: string | null
  banner_mobile_position?: string | null
  pix_key?: string | null
  presentation_message?: string | null
  vende_cnpj?: boolean
  business_type?: string | null
  working_hours?: Record<number, { open: string; close: string; closed: boolean }>
  always_open?: boolean
  updated_at?: string
}

const Configuracoes = () => {
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [bakerySettings, setBakerySettings] = useState<BakerySettings>({})

  const [profileData, setProfileData] = useState({
    full_name: '',
    email: user?.email || ''
  })

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const [bannerMobileFile, setBannerMobileFile] = useState<File | null>(null)
  const [bannerMobilePreview, setBannerMobilePreview] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchBakerySettings()
      fetchProfile()
    }
  }, [user])

  const fetchBakerySettings = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('bakery_settings')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setBakerySettings(data)
        setLogoPreview(data.logo_url || null)
        setBannerPreview(data.banner_url || null)
        setBannerMobilePreview(data.banner_mobile_url || null)
      } else {
        setBakerySettings({})
        setLogoPreview(null)
        setBannerPreview(null)
        setBannerMobilePreview(null)
      }
    } catch (error) {
      console.error(error)
      showError('Erro ao carregar dados da loja')
    }
  }

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          email: data.email || user.email || ''
        })
      }
    } catch {
      showError('Erro ao carregar dados do perfil')
    }
  }

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione apenas imagens')
      return
    }

    setLoading(true)
    try {
      const optimized = await optimizeImage(file, 512, 512, 0.8)
      setLogoFile(optimized)
      setLogoPreview(URL.createObjectURL(optimized))
    } catch (err) {
      showError('Erro ao processar imagem')
    } finally {
      setLoading(false)
    }
  }

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione apenas imagens')
      return
    }

    setLoading(true)
    try {
      const optimized = await optimizeImage(file, 1920, 1080, 0.8)
      setBannerFile(optimized)
      setBannerPreview(URL.createObjectURL(optimized))
    } catch (err) {
      showError('Erro ao processar imagem')
    } finally {
      setLoading(false)
    }
  }

  const handleBannerMobileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione apenas imagens')
      return
    }

    setLoading(true)
    try {
      const optimized = await optimizeImage(file, 1080, 1920, 0.8)
      setBannerMobileFile(optimized)
      setBannerMobilePreview(URL.createObjectURL(optimized))
    } catch (err) {
      showError('Erro ao processar imagem')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setBakerySettings(prev => ({ ...prev, logo_url: null }))
  }

  const handleRemoveBanner = () => {
    setBannerFile(null)
    setBannerPreview(null)
    setBakerySettings(prev => ({ ...prev, banner_url: null }))
  }

  const handleRemoveBannerMobile = () => {
    setBannerMobileFile(null)
    setBannerMobilePreview(null)
    setBakerySettings(prev => ({ ...prev, banner_mobile_url: null }))
  }

  const uploadFile = async (
    bucket: string,
    path: string,
    file: File
  ) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600'
      })

    if (error) throw error

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return publicData.publicUrl
  }

  const removeOldFile = async (bucket: string, url: string | null | undefined) => {
    if (!url) return
    const path = url.split(`/${bucket}/`)[1]
    if (path) {
      await supabase.storage.from(bucket).remove([path])
    }
  }

  const handleSaveBakerySettings = async () => {
    if (!user) {
      showError('Usuário não autenticado')
      return
    }

    setLoading(true)

    try {
      let logoUrl = bakerySettings.logo_url || null
      let bannerUrl = bakerySettings.banner_url || null
      let bannerMobileUrl = bakerySettings.banner_mobile_url || null

      if (logoFile) {
        if (bakerySettings.logo_url) {
          await removeOldFile('bakery-logos', bakerySettings.logo_url)
        }

        const ext = logoFile.name.split('.').pop()
        logoUrl = await uploadFile('bakery-logos', `${user.id}/logo.${ext}`, logoFile)
      }

      if (bannerFile) {
        if (bakerySettings.banner_url) {
          await removeOldFile('bakery-banners', bakerySettings.banner_url)
        }

        const ext = bannerFile.name.split('.').pop()
        bannerUrl = await uploadFile('bakery-banners', `${user.id}/banner.${ext}`, bannerFile)
      }

      if (bannerMobileFile) {
        if (bakerySettings.banner_mobile_url) {
          await removeOldFile('bakery-banners', bakerySettings.banner_mobile_url)
        }

        const ext = bannerMobileFile.name.split('.').pop()
        bannerMobileUrl = await uploadFile(
          'bakery-banners',
          `${user.id}/banner-mobile.${ext}`,
          bannerMobileFile
        )
      }

      if (!logoPreview && !logoFile && bakerySettings.logo_url) {
        await removeOldFile('bakery-logos', bakerySettings.logo_url)
        logoUrl = null
      }

      if (!bannerPreview && !bannerFile && bakerySettings.banner_url) {
        await removeOldFile('bakery-banners', bakerySettings.banner_url)
        bannerUrl = null
      }

      if (!bannerMobilePreview && !bannerMobileFile && bakerySettings.banner_mobile_url) {
        await removeOldFile('bakery-banners', bakerySettings.banner_mobile_url)
        bannerMobileUrl = null
      }

      // Removemos campos que podem não estar no banco ainda para evitar erro
      const { always_open, banner_position, banner_mobile_position, ...settingsWithoutExtras } = bakerySettings;

      const settingsToSave = {
        ...settingsWithoutExtras,
        id: user.id,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        banner_mobile_url: bannerMobileUrl,
        banner_position: banner_position || '50%',
        banner_mobile_position: banner_mobile_position || '50%',
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bakery_settings')
        .upsert(settingsToSave, { onConflict: 'id' })

      if (error) throw error

      showSuccess('Configurações salvas com sucesso!')
      setLogoFile(null)
      setBannerFile(null)
      setBannerMobileFile(null)
      fetchBakerySettings()

    } catch (err: any) {
      console.error(err)
      showError(err?.message || 'Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) {
      showError('Usuário não autenticado')
      return
    }

    setLoading(true)

    try {
      if (!profileData.full_name.trim()) {
        showError('Nome completo é obrigatório')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profileData.full_name,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (error) throw error

      showSuccess('Perfil atualizado com sucesso!')
    } catch (err: any) {
      showError(err?.message || 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configurações</h1>

        <Tabs defaultValue="bakery" className="space-y-6">

          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bakery" className="flex gap-2 items-center">
              <Store className="w-4 h-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex gap-2 items-center">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex gap-2 items-center">
              <Store className="w-4 h-4" />
              Horários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bakery">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Dados da Loja
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-8">

                {/* Logo */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Logo da loja</h3>

                  <div className="flex items-center gap-6">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={logoPreview || undefined} />
                      <AvatarFallback>
                        <Store />
                      </AvatarFallback>
                    </Avatar>

                    <div className="space-y-2">
                      <Label htmlFor="logo-upload">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Escolher logo
                          </span>
                        </Button>
                      </Label>

                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />

                      {logoPreview && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleRemoveLogo}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remover logo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Banner desktop */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Banner (desktop)
                  </h3>

                  {bannerPreview && (
                    <div className="max-w-xl rounded-lg border overflow-hidden">
                      <img
                        src={bannerPreview}
                        className="w-full h-40 object-cover"
                        style={{ objectPosition: `center ${bakerySettings.banner_position || '50%'}` }}
                      />
                    </div>
                  )}

                  {bannerPreview && (
                    <div className="space-y-2 max-w-xl">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Ajuste Vertical (Foco)</span>
                        <span>{bakerySettings.banner_position || '50%'}</span>
                      </div>
                      <Slider
                        value={[parseInt(bakerySettings.banner_position?.replace('%', '') || '50')]}
                        onValueChange={(val) => setBakerySettings(prev => ({ ...prev, banner_position: `${val[0]}%` }))}
                        max={100}
                        step={1}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Label htmlFor="banner-upload">
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Escolher banner desktop
                        </span>
                      </Button>
                    </Label>

                    <Input
                      id="banner-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerSelect}
                      className="hidden"
                    />

                    {bannerPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveBanner}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Recomendado: 1920x600px
                  </p>
                </div>

                <Separator />

                {/* Banner mobile */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Banner (mobile)
                  </h3>

                  {bannerMobilePreview && (
                    <div className="max-w-xs rounded-lg border overflow-hidden">
                      <img
                        src={bannerMobilePreview}
                        className="w-full h-48 object-cover"
                        style={{ objectPosition: `center ${bakerySettings.banner_mobile_position || '50%'}` }}
                      />
                    </div>
                  )}

                  {bannerMobilePreview && (
                    <div className="space-y-2 max-w-xs">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Ajuste Vertical (Foco)</span>
                        <span>{bakerySettings.banner_mobile_position || '50%'}</span>
                      </div>
                      <Slider
                        value={[parseInt(bakerySettings.banner_mobile_position?.replace('%', '') || '50')]}
                        onValueChange={(val) => setBakerySettings(prev => ({ ...prev, banner_mobile_position: `${val[0]}%` }))}
                        max={100}
                        step={1}
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Label htmlFor="banner-mobile-upload">
                      <Button variant="outline" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Escolher banner mobile
                        </span>
                      </Button>
                    </Label>

                    <Input
                      id="banner-mobile-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerMobileSelect}
                      className="hidden"
                    />

                    {bannerMobilePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveBannerMobile}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-gray-500">
                    Recomendado: 1200x900px (formato horizontal)
                  </p>
                </div>

                {/* resto do formulário permanece igual */}

                <Separator />


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="space-y-2">
                    <Label>Nome da loja</Label>
                    <Input
                      value={bakerySettings.bakery_name || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, bakery_name: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email da loja</Label>
                    <Input
                      value={bakerySettings.email || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>CPF / CNPJ</Label>
                    <Input
                      value={bakerySettings.cpf_cnpj || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, cpf_cnpj: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input
                      value={bakerySettings.phone || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      id="vende_cnpj"
                      type="checkbox"
                      checked={bakerySettings.vende_cnpj || false}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, vende_cnpj: e.target.checked }))
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="vende_cnpj" className="cursor-pointer font-medium">Vende para CNPJ?</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Ramo do negócio</Label>
                    <Select
                      value={bakerySettings.business_type || undefined}
                      onValueChange={(value) => setBakerySettings(prev => ({ ...prev, business_type: value }))}
                    >
                      <SelectTrigger className="w-full bg-white border-2 border-gray-100 h-10 rounded-lg focus:ring-2 focus:ring-purple-100 transition-all">
                        <SelectValue placeholder="Selecione o ramo do seu negócio" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                <Separator />

                <div className="space-y-4">

                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      value={bakerySettings.pix_key || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, pix_key: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensagem de apresentação</Label>
                    <Input
                      value={bakerySettings.presentation_message || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, presentation_message: e.target.value }))
                      }
                    />
                  </div>

                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Input
                      value={bakerySettings.address_state || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, address_state: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={bakerySettings.address_city || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, address_city: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input
                      value={bakerySettings.address_neighborhood || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, address_neighborhood: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rua</Label>
                    <Input
                      value={bakerySettings.address_street || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, address_street: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={bakerySettings.address_number || ''}
                      onChange={(e) =>
                        setBakerySettings(prev => ({ ...prev, address_number: e.target.value }))
                      }
                    />
                  </div>

                </div>


                <Button
                  className="w-full"
                  onClick={handleSaveBakerySettings}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar configurações da loja'}
                </Button>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Meu perfil
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">

                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData(prev => ({
                        ...prev,
                        full_name: e.target.value
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={profileData.email}
                    disabled
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar perfil'}
                </Button>

              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hours">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Horário de Funcionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Defina os horários em que sua loja está aberta para receber pedidos.
                </p>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-blue-50/50 border-blue-100">
                  <div className="space-y-1">
                    <Label htmlFor="always_open" className="text-base font-bold text-blue-900 cursor-pointer">Sempre Aberto</Label>
                    <p className="text-xs text-blue-700">Ative esta opção se sua loja funciona 24 horas por dia, 7 dias por semana.</p>
                  </div>
                  <input
                    type="checkbox"
                    id="always_open"
                    checked={bakerySettings.always_open || false}
                    onChange={(e) => setBakerySettings(prev => ({ ...prev, always_open: e.target.checked }))}
                    className="w-5 h-5 accent-blue-600 cursor-pointer"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const dayNames = [
                      'Domingo', 'Segunda-feira', 'Terça-feira',
                      'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
                    ]
                    const hours = (bakerySettings?.working_hours as any)?.[day] || { open: '08:00', close: '18:00', closed: false }

                    return (
                      <div key={day} className={`flex flex-wrap items-center gap-4 p-4 rounded-lg border bg-card transition-opacity ${bakerySettings.always_open ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="w-32 font-medium">{dayNames[day]}</div>

                        <div className="flex flex-1 items-center gap-6 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`closed-${day}`}
                              checked={hours.closed}
                              onChange={(e) => {
                                const newHours = { ...(bakerySettings.working_hours || {}) }
                                newHours[day] = { ...hours, closed: e.target.checked }
                                setBakerySettings(prev => ({ ...prev, working_hours: newHours }))
                              }}
                              className="w-4 h-4"
                            />
                            <Label htmlFor={`closed-${day}`} className="cursor-pointer">Fechado</Label>
                          </div>

                          {!hours.closed && (
                            <>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`allday-${day}`}
                                  checked={hours.open === '00:00' && hours.close === '23:59'}
                                  onChange={(e) => {
                                    const newHours = { ...(bakerySettings.working_hours || {}) }
                                    if (e.target.checked) {
                                      newHours[day] = { ...hours, open: '00:00', close: '23:59' }
                                    } else {
                                      newHours[day] = { ...hours, open: '08:00', close: '18:00' }
                                    }
                                    setBakerySettings(prev => ({ ...prev, working_hours: newHours }))
                                  }}
                                  className="w-4 h-4"
                                />
                                <Label htmlFor={`allday-${day}`} className="cursor-pointer whitespace-nowrap">Aberto 24h</Label>
                              </div>

                              <div className={`flex items-center gap-4 ml-auto transition-opacity ${(hours.open === '00:00' && hours.close === '23:59') ? 'opacity-30 pointer-events-none' : ''}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">De:</span>
                                  <Input
                                    type="time"
                                    value={hours.open}
                                    className="w-24"
                                    onChange={(e) => {
                                      const newHours = { ...(bakerySettings.working_hours || {}) }
                                      newHours[day] = { ...hours, open: e.target.value }
                                      setBakerySettings(prev => ({ ...prev, working_hours: newHours }))
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">Até:</span>
                                  <Input
                                    type="time"
                                    value={hours.close}
                                    className="w-24"
                                    onChange={(e) => {
                                      const newHours = { ...(bakerySettings.working_hours || {}) }
                                      newHours[day] = { ...hours, close: e.target.value }
                                      setBakerySettings(prev => ({ ...prev, working_hours: newHours }))
                                    }}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={handleSaveBakerySettings}
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar horários de funcionamento'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </Layout >
  )
}

export default Configuracoes
