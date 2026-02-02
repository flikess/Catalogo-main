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
  pix_key?: string | null
  presentation_message?: string | null
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
      } else {
        setBakerySettings({})
        setLogoPreview(null)
        setBannerPreview(null)
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

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione apenas imagens')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      showError('A imagem deve ter no máximo 2MB')
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Selecione apenas imagens')
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      showError('O banner deve ter no máximo 4MB')
      return
    }

    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
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

  const removeOldFile = async (bucket: string, url: string | null | undefined, folder: string) => {
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

      if (logoFile) {
        if (bakerySettings.logo_url) {
          await removeOldFile('bakery-logos', bakerySettings.logo_url, user.id)
        }

        const ext = logoFile.name.split('.').pop()
        const path = `${user.id}/logo.${ext}`

        logoUrl = await uploadFile('bakery-logos', path, logoFile)
      }

      if (bannerFile) {
        if (bakerySettings.banner_url) {
          await removeOldFile('bakery-banners', bakerySettings.banner_url, user.id)
        }

        const ext = bannerFile.name.split('.').pop()
        const path = `${user.id}/banner.${ext}`

        bannerUrl = await uploadFile('bakery-banners', path, bannerFile)
      }

      if (!logoPreview && !logoFile && bakerySettings.logo_url) {
        await removeOldFile('bakery-logos', bakerySettings.logo_url, user.id)
        logoUrl = null
      }

      if (!bannerPreview && !bannerFile && bakerySettings.banner_url) {
        await removeOldFile('bakery-banners', bakerySettings.banner_url, user.id)
        bannerUrl = null
      }

      const settingsToSave: BakerySettings = {
        ...bakerySettings,
        id: user.id,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bakery_settings')
        .upsert(settingsToSave, { onConflict: 'id' })

      if (error) throw error

      showSuccess('Configurações salvas com sucesso!')
      setLogoFile(null)
      setBannerFile(null)
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bakery" className="flex gap-2 items-center">
              <Store className="w-4 h-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex gap-2 items-center">
              <User className="w-4 h-4" />
              Perfil
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

                      <p className="text-xs text-gray-500">
                        PNG ou JPG até 2MB. Recomendado 200x200px.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Banner */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Banner do topo do catálogo
                  </h3>

                  <div className="space-y-4">

                    {bannerPreview && (
                      <div className="relative w-full max-w-xl overflow-hidden rounded-lg border">
                        <img
                          src={bannerPreview}
                          alt="Banner"
                          className="w-full h-40 object-cover"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Label htmlFor="banner-upload">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Escolher banner
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
                          Remover banner
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-gray-500">
                      Recomendado: 1920x600px (imagem horizontal). Máx. 4MB.
                    </p>

                  </div>
                </div>

                <Separator />

                {/* Informações básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Informações básicas
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Label>Nome da loja</Label>
                      <Input
                        value={bakerySettings.bakery_name || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, bakery_name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>CPF / CNPJ</Label>
                      <Input
                        value={bakerySettings.cpf_cnpj || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, cpf_cnpj: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Chave Pix</Label>
                      <Input
                        value={bakerySettings.pix_key || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, pix_key: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Mensagem de apresentação</Label>
                      <Input
                        value={bakerySettings.presentation_message || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, presentation_message: e.target.value })
                        }
                      />
                      <p className="text-xs text-gray-500">
                        Exibida no topo do catálogo público.
                      </p>
                    </div>

                  </div>
                </div>

                <Separator />

                {/* Contato */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contato
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input
                        type="email"
                        value={bakerySettings.email || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, email: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={bakerySettings.phone || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Endereço */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Endereço
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input
                        value={bakerySettings.address_state || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, address_state: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={bakerySettings.address_city || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, address_city: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input
                        value={bakerySettings.address_neighborhood || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, address_neighborhood: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rua</Label>
                      <Input
                        value={bakerySettings.address_street || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, address_street: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={bakerySettings.address_number || ''}
                        onChange={e =>
                          setBakerySettings({ ...bakerySettings, address_number: e.target.value })
                        }
                      />
                    </div>

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
                  Perfil pessoal
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input
                      value={profileData.full_name}
                      onChange={e =>
                        setProfileData({ ...profileData, full_name: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      value={profileData.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar perfil'}
                </Button>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default Configuracoes
