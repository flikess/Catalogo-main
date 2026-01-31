import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, Lock, Camera, Eye, EyeOff, Crown, Calendar, CreditCard } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'

const Profile = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: user?.email || '',
    avatar_url: ''
  })

  const [subscriptionInfo, setSubscriptionInfo] = useState({
    plano: '',
    vencimento: '',
    data_pagamento: '',
    isActive: false
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
      loadSubscriptionInfo()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || user?.email || '',
          avatar_url: data.avatar_url || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const loadSubscriptionInfo = () => {
    if (user?.user_metadata) {
      const metadata = user.user_metadata
      const vencimento = metadata.vencimento ? new Date(metadata.vencimento) : null
      const isActive = vencimento ? vencimento > new Date() : false

      setSubscriptionInfo({
        plano: metadata.plano || '',
        vencimento: metadata.vencimento || '',
        data_pagamento: metadata.data_pagamento || '',
        isActive
      })
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      showSuccess('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Error updating profile:', error)
      showError('Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingAvatar(true)
    try {
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/avatars/')[1]
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath])
        }
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: publicUrl })
      showSuccess('Foto de perfil atualizada com sucesso!')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      showError('Erro ao fazer upload da foto')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showError('Preencha todos os campos de senha')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('A nova senha e confirmação não coincidem')
      return
    }

    if (passwordData.newPassword.length < 6) {
      showError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      showError('A nova senha deve ser diferente da senha atual')
      return
    }

    setLoading(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      })

      if (signInError) {
        throw new Error('Senha atual incorreta')
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })

      showSuccess('Senha alterada com sucesso!')
    } catch (error: any) {
      console.error('Error changing password:', error)
      showError(error.message || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatDateWithTime = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSubscriptionStatus = () => {
    if (!subscriptionInfo.vencimento) return null

    const vencimento = new Date(subscriptionInfo.vencimento)
    const hoje = new Date()
    const diasRestantes = Math.ceil((vencimento.getTime()  - hoje.getTime()) / (1000 * 60 * 60 * 24))

    if (diasRestantes < 0) {
      return { status: 'expired', label: 'Expirada', color: 'bg-red-100 text-red-800' }
    } else if (diasRestantes <= 7) {
      return { status: 'expiring', label: 'Expirando em breve', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { status: 'active', label: 'Ativa', color: 'bg-green-100 text-green-800' }
    }
  }

  const subscriptionStatus = getSubscriptionStatus()

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Assinatura
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Foto de Perfil */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">Foto de Perfil</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={profile.avatar_url} alt="Avatar" />
                    <AvatarFallback className="text-2xl">
                      {getInitials(profile.full_name, profile.email)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="text-center">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" disabled={uploadingAvatar} asChild>
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          {uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
                        </span>
                      </Button>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-2">
                      PNG, JPG até 2MB
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Informações Pessoais */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Digite seu nome completo"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">
                      O e-mail não pode ser alterado aqui
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data de Cadastro</Label>
                    <Input
                      value={user?.created_at ? formatDate(user.created_at) : ''}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <Button onClick={handleSaveProfile} disabled={loading} className="w-full">
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Informações da Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscriptionInfo.plano ? (
                  <>
                    {/* Status da Assinatura */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Crown className="w-8 h-8 text-purple-600" />
                        <div>
                          <h3 className="font-semibold text-lg">Plano {subscriptionInfo.plano}</h3>
                          {subscriptionStatus && (
                            <Badge className={subscriptionStatus.color}>
                              {subscriptionStatus.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <CreditCard className="w-6 h-6 text-gray-400 mb-1" />
                        <p className="text-sm text-gray-500">Ativo</p>
                      </div>
                    </div>

                    {/* Detalhes da Assinatura */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Plano Atual</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Crown className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold">{subscriptionInfo.plano}</span>
                          </div>
                        </div>

                        {subscriptionInfo.data_pagamento && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Data do Pagamento</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-4 h-4 text-green-600" />
                              <span>{formatDate(subscriptionInfo.data_pagamento)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {subscriptionInfo.vencimento && (
                          <div>
                            <Label className="text-sm font-medium text-gray-500">Válido até</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold">
                                {formatDate(subscriptionInfo.vencimento)}
                              </span>
                            </div>
                          </div>
                        )}

                        <div>
                          <Label className="text-sm font-medium text-gray-500">Status</Label>
                          <div className="mt-1">
                            {subscriptionStatus && (
                              <Badge className={subscriptionStatus.color}>
                                {subscriptionStatus.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Informações Adicionais */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">
                        Benefícios do seu plano:
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>✅ Gestão completa de pedidos e clientes</li>
                        <li>✅ Controle de estoque e produtos</li>
                        <li>✅ Relatórios financeiros detalhados</li>
                        <li>✅ Catálogos online personalizados</li>
                        <li>✅ Suporte técnico prioritário</li>
                        {subscriptionInfo.plano === 'Anual' && (
                          <li>✅ Desconto especial no plano anual</li>
                        )}
                      </ul>
                    </div>

                    {/* Aviso de Renovação */}
                    {subscriptionStatus?.status === 'expiring' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-yellow-900 mb-2">
                          ⚠️ Sua assinatura expira em breve!
                        </h4>
                        <p className="text-sm text-yellow-800">
                          Para continuar aproveitando todos os recursos do Cataloguei, 
                          renove sua assinatura antes do vencimento.
                        </p>
                      </div>
                    )}

                    {subscriptionStatus?.status === 'expired' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-2">
                          ❌ Assinatura Expirada
                        </h4>
                        <p className="text-sm text-red-800">
                          Sua assinatura expirou. Renove agora para continuar usando o sistema.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Crown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhuma assinatura encontrada
                    </h3>
                    <p className="text-gray-500">
                      Você ainda não possui uma assinatura ativa.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual *</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      placeholder="Digite sua senha atual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha *</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      placeholder="Digite sua nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mínimo de 6 caracteres
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      placeholder="Confirme sua nova senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">
                    Dicas de Segurança:
                  </h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Use uma senha forte com pelo menos 8 caracteres</li>
                    <li>• Combine letras maiúsculas, minúsculas, números e símbolos</li>
                    <li>• Não use informações pessoais na senha</li>
                    <li>• Não compartilhe sua senha com ninguém</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}

export default Profile