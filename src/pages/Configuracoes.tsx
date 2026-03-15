import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Store, User, MapPin, Phone, FileText, Upload, X, Image as ImageIcon, Settings, Clock, CheckCircle2, AlertCircle, Link } from 'lucide-react'
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
  checkout_enabled?: boolean
  payment_enabled?: boolean
  delivery_enabled?: boolean
  updated_at?: string
}

interface PaymentConfig {
  gateway_name: string
  access_token: string
  public_key: string
  status: boolean
}

const Configuracoes = () => {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const isAdmin = user?.email?.toLowerCase().trim() === 'lucianderson.ads@gmail.com';

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

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    gateway_name: 'mercadopago',
    access_token: '',
    public_key: '',
    status: false
  })

  useEffect(() => {
    if (user) {
      fetchBakerySettings()
      fetchProfile()
      fetchPaymentConfig()
    }
  }, [user])

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && user) {
      handleOAuthReturn(code)
    }
  }, [searchParams, user])

  const handleOAuthReturn = async (authCode: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('mp-oauth', {
        body: { code: authCode, redirect_uri: `${window.location.origin}/configuracoes` }
      })

      if (error) throw error

      showSuccess('Mercado Pago conectado com sucesso!')
      setSearchParams({}) // Limpa a URL
      fetchPaymentConfig()
    } catch (err: any) {
      showError(err?.message || 'Erro ao conectar Mercado Pago. Verifique as chaves.')
      setSearchParams({})
    } finally {
      setLoading(false)
    }
  }

  const handleConnectMP = () => {
    const clientId = import.meta.env.VITE_MP_CLIENT_ID
    if (!clientId) {
      showError('O dono do sistema ainda não configurou o VITE_MP_CLIENT_ID.')
      return
    }
    const redirectUri = `${window.location.origin}/configuracoes`
    const url = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&state=${user?.id}&redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.href = url
  }

  const handleDisconnectMP = async () => {
    if (!confirm('Deseja realmente desconectar sua conta do Mercado Pago?')) return
    setLoading(true)
    try {
      const { error } = await supabase.from('payment_configs').delete().eq('user_id', user?.id).eq('gateway_name', 'mercadopago')
      if (error) throw error
      showSuccess('Mercado Pago desconectado')
      setPaymentConfig({ gateway_name: 'mercadopago', access_token: '', public_key: '', status: false })
    } catch (e) {
      showError('Erro ao desconectar')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentConfig = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('payment_configs')
        .select('*')
        .eq('user_id', user.id)
        .eq('gateway_name', 'mercadopago')
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setPaymentConfig({
          gateway_name: data.gateway_name,
          access_token: data.access_token || '',
          public_key: data.public_key || '',
          status: data.status || false
        })
      }
    } catch (err) {
      console.error('Erro ao buscar configuração de pagamento', err)
    }
  }

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
        setLogoPreview(data.logo_url ? `${data.logo_url}?t=${new Date().getTime()}` : null)
        setBannerPreview(data.banner_url ? `${data.banner_url}?t=${new Date().getTime()}` : null)
        setBannerMobilePreview(data.banner_mobile_url ? `${data.banner_mobile_url}?t=${new Date().getTime()}` : null)
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

      // Salvar as configurações de pagamento se habilitado
      if (bakerySettings.payment_enabled && paymentConfig.access_token) {
        const { error: paymentError } = await supabase
          .from('payment_configs')
          .update({
            status: paymentConfig.status,
            updated_at: new Date().toISOString()
          }).eq('user_id', user.id).eq('gateway_name', 'mercadopago')

        if (paymentError) console.error("Erro ao salvar config pagamento", paymentError)
      }

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

          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="bakery" className="flex gap-2 items-center">
              <Store className="w-4 h-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex gap-2 items-center">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="hours" className="flex gap-2 items-center">
              <Clock className="w-4 h-4" />
              Horários
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="definitions" className="flex gap-2 items-center">
                <Settings className="w-4 h-4" />
                Definições
              </TabsTrigger>
            )}
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


          {isAdmin && (
            <TabsContent value="definitions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Definições da Loja
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="space-y-1">
                        <Label htmlFor="checkout_enabled" className="text-base font-bold cursor-pointer">Requerer Finalização de Compra (Checkout)</Label>
                        <p className="text-xs text-muted-foreground">Ative se os clientes precisam passar por um processo de checkout para enviar o pedido.</p>
                      </div>
                      <input
                        type="checkbox"
                        id="checkout_enabled"
                        checked={bakerySettings.checkout_enabled ?? true}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setBakerySettings(prev => ({
                            ...prev,
                            checkout_enabled: isChecked,
                            ...(isChecked ? {} : { payment_enabled: false, delivery_enabled: false })
                          }))
                        }}
                        className="w-5 h-5 accent-purple-600 cursor-pointer"
                      />
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-lg border bg-card transition-opacity ${!(bakerySettings.checkout_enabled ?? true) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="space-y-1">
                        <Label htmlFor="payment_enabled" className="text-base font-bold cursor-pointer">Processar Pagamentos Online</Label>
                        <p className="text-xs text-muted-foreground">Ative se você quiser opções de pagamento online habilitadas na finalização.</p>
                      </div>
                      <input
                        type="checkbox"
                        id="payment_enabled"
                        checked={bakerySettings.payment_enabled ?? false}
                        disabled={!(bakerySettings.checkout_enabled ?? true)}
                        onChange={(e) => setBakerySettings(prev => ({ ...prev, payment_enabled: e.target.checked }))}
                        className="w-5 h-5 accent-purple-600 cursor-pointer"
                      />
                    </div>

                    <div className={`flex items-center justify-between p-4 rounded-lg border bg-card transition-opacity ${!(bakerySettings.checkout_enabled ?? true) ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className="space-y-1">
                        <Label htmlFor="delivery_enabled" className="text-base font-bold cursor-pointer">Permitir Opções de Envio/Entrega</Label>
                        <p className="text-xs text-muted-foreground">Ative se sua loja faz entregas ou envia produtos para o cliente (frete).</p>
                      </div>
                      <input
                        type="checkbox"
                        id="delivery_enabled"
                        checked={bakerySettings.delivery_enabled ?? false}
                        disabled={!(bakerySettings.checkout_enabled ?? true)}
                        onChange={(e) => setBakerySettings(prev => ({ ...prev, delivery_enabled: e.target.checked }))}
                        className="w-5 h-5 accent-purple-600 cursor-pointer"
                      />
                    </div>

                    {/* Painel do Mercado Pago (Aparece apenas quando Pagamentos Online estão ativos) */}
                    {bakerySettings.payment_enabled && (
                      <div className="mt-8 p-6 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-blue-600 p-2 rounded-lg">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white"><path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" /><path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-blue-900">Integração Mercado Pago</h4>
                            <p className="text-sm text-blue-700">Insira suas credenciais de Produção para gerar Pix/Link na hora.</p>
                          </div>
                        </div>

                        <div className="space-y-4 max-w-2xl bg-white p-4 rounded-lg border">

                          {paymentConfig.access_token ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg gap-4">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-8 h-8 text-green-500" />
                                <div>
                                  <h4 className="font-bold text-green-900">Conta Conectada</h4>
                                  <p className="text-xs text-green-700">O Mercado Pago está pronto para processar vendas em seu nome.</p>
                                </div>
                              </div>
                              <Button variant="outline" size="sm" onClick={handleDisconnectMP} className="text-red-600 border-red-200 hover:bg-red-50">
                                Desconectar Conta
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 border border-gray-200 bg-gray-50 rounded-lg text-center">
                              <AlertCircle className="w-10 h-10 text-gray-400 mb-3" />
                              <h4 className="font-bold text-gray-700 mb-1">Nenhuma conta conectada</h4>
                              <p className="text-sm text-gray-500 mb-4 max-w-sm">Para receber pagamentos via Pix ou Cartão diretamente na sua conta, autorize o aplicativo.</p>
                              <Button onClick={handleConnectMP} type="button" className="bg-[#009EE3] hover:bg-[#0089C5] text-white w-full sm:w-auto shadow-md">
                                <Link className="w-4 h-4 mr-2" />
                                Conectar com Mercado Pago
                              </Button>
                            </div>
                          )}

                          {paymentConfig.access_token && (
                            <>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="mp_status" className="text-sm font-medium cursor-pointer text-gray-900">Processar Pagamentos no Catálogo Público</Label>
                                  <p className="text-xs text-gray-500">Se desmarcado, a opção de pagamento não será exibida no fechamento do carrinho e o pagamento será combinado no WhatsApp.</p>
                                </div>
                                <input
                                  type="checkbox"
                                  id="mp_status"
                                  checked={paymentConfig.status}
                                  onChange={(e) => setPaymentConfig(prev => ({ ...prev, status: e.target.checked }))}
                                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                  <div className="pt-4 border-t">
                    <Button
                      className="w-full"
                      onClick={handleSaveBakerySettings}
                      disabled={loading}
                    >
                      {loading ? 'Salvando...' : 'Salvar definições'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

        </Tabs>
      </div>
    </Layout >
  )
}

export default Configuracoes
