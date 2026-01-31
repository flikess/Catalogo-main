import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Store, User, MapPin, Phone, FileText, Upload, X } from 'lucide-react'
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
  pix_key?: string | null
  presentation_message?: string | null

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

  useEffect(() => {
    if (user) {
      fetchBakerySettings()
      fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } else {
        // Caso não exista ainda, limpar
        setBakerySettings({})
        setLogoPreview(null)
      }
    } catch (error) {
      console.error('Error fetching bakery settings:', error)
      showError('Erro ao carregar dados da Loja')
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

    if (error) {
      console.error('Erro Supabase:', error) // <-- Veja esse log no console
      throw error
    }

    if (data) {
      setProfileData({
        full_name: data.full_name || '',
        email: data.email || user.email || ''
      })
    }
  } catch (error) {
    showError('Erro ao carregar dados do perfil')
  }
}


  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Por favor, selecione apenas arquivos de imagem')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      showError('A imagem deve ter no máximo 2MB')
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRemoveLogo = async () => {
    setLogoFile(null)
    setLogoPreview(null)
    setBakerySettings(prev => ({ ...prev, logo_url: null }))
  }

  const handleSaveBakerySettings = async () => {
    if (!user) {
      showError('Usuário não autenticado')
      return
    }

    setLoading(true)

    try {
      let logoUrl = bakerySettings.logo_url || null

      // Se um novo logo foi selecionado, faz upload
      if (logoFile) {
        // Remove logo antiga
        if (bakerySettings.logo_url) {
          const oldPath = bakerySettings.logo_url.split('/bakery-logos/')[1]
          if (oldPath) {
            await supabase.storage.from('bakery-logos').remove([oldPath])
          }
        }

        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${user.id}/logo.${fileExt}`

        const { data, error: uploadError } = await supabase.storage
          .from('bakery-logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) throw uploadError

        const { data: publicData } = supabase.storage
          .from('bakery-logos')
          .getPublicUrl(data.path)

        logoUrl = publicData.publicUrl
      }

      // Se o logo foi removido (preview é null e não tem logoFile)
      if (!logoPreview && !logoFile && bakerySettings.logo_url) {
        const oldPath = bakerySettings.logo_url.split('/bakery-logos/')[1]
        if (oldPath) {
          await supabase.storage.from('bakery-logos').remove([oldPath])
        }
        logoUrl = null
      }

      const settingsToSave: BakerySettings = {
        ...bakerySettings,
        id: user.id,
        logo_url: logoUrl,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('bakery_settings')
        .upsert(settingsToSave, { onConflict: 'id' })

      if (error) throw error

      showSuccess('Configurações da Loja salvas com sucesso!')
      setLogoFile(null)
      fetchBakerySettings()
    } catch (error: any) {
      console.error('Error saving bakery settings:', error)
      showError(error?.message || 'Erro ao salvar configurações')
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
        setLoading(false)
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
    } catch (error: any) {
      console.error('Error saving profile:', error)
      showError(error?.message || 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>

        <Tabs defaultValue="bakery" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bakery" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              Loja
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Perfil Pessoal
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
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Logo da Loja</h3>
                  <div className="flex items-center gap-6">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={logoPreview || undefined} alt="Logo" />
                      <AvatarFallback className="text-2xl">
                        <Store />
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <Button variant="outline" asChild>
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Escolher Arquivo
                          </span>
                        </Button>
                        <Input
                          id="logo-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoSelect}
                          className="hidden"
                        />
                      </Label>
                      {logoPreview && (
                        <Button variant="outline" onClick={handleRemoveLogo}>
                          <X className="w-4 h-4 mr-2" />
                          Remover Logo
                        </Button>
                      )}
                      <p className="text-xs text-gray-500">
                        PNG, JPG até 2MB. Recomendado: 200x200px.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Informações Básicas
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bakery_name">Nome da Loja</Label>
                      <Input
                        id="bakery_name"
                        value={bakerySettings.bakery_name || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, bakery_name: e.target.value })}
                        placeholder="Nome da sua Loja"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                      <Input
                        id="cpf_cnpj"
                        value={bakerySettings.cpf_cnpj || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, cpf_cnpj: e.target.value })}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      />
                    </div>
<div className="space-y-2">
  <Label htmlFor="pix_key">Chave Pix</Label>
  <Input
    id="pix_key"
    value={bakerySettings.pix_key || ''}
    onChange={(e) => setBakerySettings({ ...bakerySettings, pix_key: e.target.value })}
    placeholder="Informe sua chave Pix (e-mail, CPF, aleatória...)"
  />
</div>
<div className="space-y-2">
  <Label htmlFor="presentation_message">Mensagem de Apresentação</Label>
  <Input
    id="presentation_message"
    value={bakerySettings.presentation_message || ''}
    onChange={(e) =>
      setBakerySettings({ ...bakerySettings, presentation_message: e.target.value })
    }
    placeholder="Ex: Feito com amor para adoçar seus momentos!"
  />
  <p className="text-xs text-gray-500">
    Essa mensagem será exibida no topo do seu catálogo público.
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
                      <Label htmlFor="bakery_email">E-mail</Label>
                      <Input
                        id="bakery_email"
                        type="email"
                        value={bakerySettings.email || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, email: e.target.value })}
                        placeholder="contato@Loja.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bakery_phone">Telefone</Label>
                      <Input
                        id="bakery_phone"
                        value={bakerySettings.phone || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, phone: e.target.value })}
                        placeholder="(11) 99999-9999"
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
                      <Label htmlFor="address_state">Estado</Label>
                      <Input
                        id="address_state"
                        value={bakerySettings.address_state || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, address_state: e.target.value })}
                        placeholder="SP"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_city">Cidade</Label>
                      <Input
                        id="address_city"
                        value={bakerySettings.address_city || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, address_city: e.target.value })}
                        placeholder="São Paulo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_neighborhood">Bairro</Label>
                      <Input
                        id="address_neighborhood"
                        value={bakerySettings.address_neighborhood || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, address_neighborhood: e.target.value })}
                        placeholder="Centro"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_street">Rua</Label>
                      <Input
                        id="address_street"
                        value={bakerySettings.address_street || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, address_street: e.target.value })}
                        placeholder="Rua das Flores"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address_number">Número</Label>
                      <Input
                        id="address_number"
                        value={bakerySettings.address_number || ''}
                        onChange={(e) => setBakerySettings({ ...bakerySettings, address_number: e.target.value })}
                        placeholder="123"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveBakerySettings}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Salvando...' : 'Salvar Configurações da Loja'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Perfil Pessoal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nome Completo</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, full_name: e.target.value })
                      }
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile_email">E-mail</Label>
                    <Input
                      id="profile_email"
                      value={profileData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-sm text-gray-500">
                      O e-mail não pode ser alterado aqui. Entre em contato com o suporte se
                      necessário.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de Cadastro</Label>
                    <Input
                      value={
                        user?.created_at
                          ? new Date(user.created_at).toLocaleDateString('pt-BR')
                          : ''
                      }
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
                  {loading ? 'Salvando...' : 'Salvar Perfil'}
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
