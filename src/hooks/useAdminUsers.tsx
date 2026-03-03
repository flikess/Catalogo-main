import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'
import { useAuth } from '@/components/auth/AuthProvider'

interface AdminUser {
  id: string
  email: string
  full_name?: string
  plano?: string
  status: 'ativo' | 'inativo'
  data_pagamento?: string
  vencimento?: string
  phone?: string
  created_at: string
}

interface CreateUserData {
  email: string
  password: string
  full_name: string
  plano: 'Mensal' | 'Anual'
  data_pagamento: string
  vencimento: string
  phone?: string
}

interface UpdateUserData {
  email: string // Garantir que email seja sempre enviado
  password?: string
  full_name?: string
  plano?: string
  data_pagamento?: string
  vencimento?: string
  phone?: string
}

export const useAdminUsers = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user) {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log('🔍 Buscando usuários via Edge Function...')

      if (user?.user_metadata?.role !== 'super_admin') {
        showError('Acesso negado')
        return
      }

      const data = await callAdminFunction('list', {})

      if (Array.isArray(data)) {
        const formattedUsers: AdminUser[] = data.map(u => {
          const vencimento = u.vencimento ? new Date(u.vencimento) : null
          const hoje = new Date()
          const status: 'ativo' | 'inativo' = (vencimento && vencimento >= hoje) ? 'ativo' : 'inativo'

          return {
            id: u.id,
            email: u.email || '',
            full_name: u.full_name || '',
            plano: u.plano || '',
            status: u.status || status,
            data_pagamento: u.data_pagamento || '',
            vencimento: u.vencimento || '',
            phone: u.phone || '',
            created_at: u.created_at
          }
        })
        setUsers(formattedUsers)
      }
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error)
      showError('Erro ao carregar lista de usuários')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsersDirectly = async () => {
    try {
      console.log('🔄 Executando busca direta...')

      // Verificar se é super admin novamente
      if (user?.user_metadata?.role !== 'super_admin') {
        console.error('❌ Usuário não é super admin para busca direta')
        throw new Error('Acesso negado para busca direta')
      }

      // Buscar todos os perfis
      console.log('📋 Buscando perfis...')
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError)
        throw profilesError
      }

      console.log('📋 Perfis encontrados:', profiles?.length || 0)

      // Buscar todas as assinaturas
      console.log('💳 Buscando assinaturas...')
      const { data: assinaturas, error: assinaturasError } = await supabase
        .from('assinaturas')
        .select('user_id, plano, data_pagamento, vencimento')

      if (assinaturasError) {
        console.error('❌ Erro ao buscar assinaturas:', assinaturasError)
        // Continuar mesmo sem assinaturas
      }

      console.log('💳 Assinaturas encontradas:', assinaturas?.length || 0)

      // Combinar dados
      const combinedUsers: AdminUser[] = profiles?.map(profile => {
        const assinatura = assinaturas?.find(a => a.user_id === profile.id)
        const vencimento = assinatura?.vencimento ? new Date(assinatura.vencimento) : null
        const hoje = new Date()
        const diffTime = vencimento ? vencimento.getTime() - hoje.getTime() : -999;

        const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: 'ativo' | 'inativo' = 'inativo'
        // Seguindo a lógica do sistema: Ativo se não venceu há mais de 2 dias
        if (vencimento && daysUntilExpiration >= -2) {
          status = 'ativo'
        }

        return {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name || '',
          plano: assinatura?.plano || '',
          status,
          data_pagamento: assinatura?.data_pagamento || '',
          vencimento: assinatura?.vencimento || '',
          phone: profile.phone || '',
          created_at: profile.created_at,
        }
      }) || []


      setUsers(combinedUsers)
      console.log(`✅ ${combinedUsers.length} usuários carregados via query direta`)
    } catch (error: any) {
      console.error('💥 Erro na busca direta:', error)
      showError(`Erro ao carregar usuários: ${error.message}`)
      setUsers([])
    }
  }

  const callAdminFunction = async (action: string, data: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Usuário não autenticado')
      }

      const response = await supabase.functions.invoke('admin-users', {
        body: { action, data },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.error) {
        throw response.error
      }

      return response.data
    } catch (error: any) {
      console.error(`❌ Erro na função admin (${action}):`, error)
      throw error
    }
  }

  const createUser = async (userData: CreateUserData) => {
    try {
      console.log('➕ Criando usuário via Edge Function:', userData.email)

      // Verificar se é super admin
      if (user?.user_metadata?.role !== 'super_admin') {
        throw new Error('Apenas super admins podem criar usuários')
      }

      const result = await callAdminFunction('create', userData)

      if (result.success) {
        showSuccess('Usuário criado com sucesso!')
        console.log('🎉 Usuário criado:', result.user)
        fetchUsers()
        return result.user
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário:', error)
      showError(`Erro ao criar usuário: ${error.message}`)
      throw error
    }
  }

  const updateUser = async (userId: string, userData: UpdateUserData) => {
    try {
      console.log('✏️ Atualizando usuário via Edge Function:', userId)
      console.log('📋 Dados enviados:', userData)

      // Verificar se é super admin
      if (user?.user_metadata?.role !== 'super_admin') {
        throw new Error('Apenas super admins podem editar usuários')
      }

      // Garantir que todos os campos obrigatórios estejam presentes
      if (!userData.email) {
        throw new Error('E-mail é obrigatório para atualização')
      }

      const result = await callAdminFunction('update', { userId, userData })

      if (result.success) {
        showSuccess('Usuário atualizado com sucesso!')
        console.log('🎉 Usuário atualizado')
        fetchUsers()
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      console.error('❌ Erro ao atualizar usuário:', error)
      showError(`Erro ao atualizar usuário: ${error.message}`)
      throw error
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      console.log('🗑️ Deletando usuário via Edge Function:', userId)

      // Verificar se é super admin
      if (user?.user_metadata?.role !== 'super_admin') {
        throw new Error('Apenas super admins podem deletar usuários')
      }

      const result = await callAdminFunction('delete', { userId })

      if (result.success) {
        showSuccess('Usuário deletado com sucesso!')
        console.log('🎉 Usuário deletado')
        fetchUsers()
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (error: any) {
      console.error('❌ Erro ao deletar usuário:', error)
      showError(`Erro ao deletar usuário: ${error.message}`)
      throw error
    }
  }

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return {
    users: filteredUsers,
    loading,
    searchTerm,
    setSearchTerm,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers: fetchUsers
  }
}