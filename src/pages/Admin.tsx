import { useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { UserForm } from '@/components/admin/UserForm'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX,
  Crown,
  Calendar,
  Mail,
  RefreshCw
} from 'lucide-react'

const Admin = () => {
  const {
    users,
    loading,
    searchTerm,
    setSearchTerm,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers
  } = useAdminUsers()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const handleCreateUser = () => {
    setEditingUser(null)
    setFormMode('create')
    setIsFormOpen(true)
  }

  const handleEditUser = (user: any) => {
    setEditingUser(user)
    setFormMode('edit')
    setIsFormOpen(true)
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      await deleteUser(userId)
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleFormSubmit = async (data: any) => {
    if (formMode === 'create') {
      await createUser(data)
    } else {
      await updateUser(editingUser.id, data)
    }
    setIsFormOpen(false)
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string) => {
    return status === 'ativo'
      ? { label: 'Ativo', color: 'bg-green-100 text-green-800' }
      : { label: 'Inativo', color: 'bg-red-100 text-red-800' }
  }

  const getPlanoBadge = (plano: string) => {
    if (!plano) return { label: 'Pendente', color: 'bg-gray-100 text-gray-800' }
    const p = plano.toLowerCase()
    if (p === 'trial') return { label: 'Trial', color: 'bg-amber-100 text-amber-800' }
    if (p === 'anual') return { label: 'Anual', color: 'bg-purple-100 text-purple-800' }
    if (p === 'mensal') return { label: 'Mensal', color: 'bg-blue-100 text-blue-800' }
    return { label: plano, color: 'bg-gray-100 text-gray-800' }
  }

  // Estatísticas
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.status === 'ativo').length
  const inactiveUsers = users.filter(u => u.status === 'inativo').length
  const annualUsers = users.filter(u => u.plano?.toLowerCase() === 'anual').length
  const trialUsers = users.filter(u => u.plano?.toLowerCase() === 'trial').length



  const tableColumns = [
    {
      key: 'user_info',
      label: 'Usuário',
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">{row.full_name || 'Sem nome'}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {row.email}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'subscription',
      label: 'Assinatura',
      render: (_: any, row: any) => (
        <div className="space-y-1">
          {row.plano && (
            <div className="flex items-center gap-2">
              <Crown className="w-3 h-3" />
              <Badge className={getPlanoBadge(row.plano).color}>
                {getPlanoBadge(row.plano).label}
              </Badge>
            </div>
          )}
          <Badge className={getStatusBadge(row.status).color}>
            {getStatusBadge(row.status).label}
          </Badge>
        </div>
      )
    },
    {
      key: 'dates',
      label: 'Datas',
      hideOnMobile: true,
      render: (_: any, row: any) => (
        <div className="text-sm space-y-1">
          {row.data_pagamento && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-green-600" />
              <span>Pago: {formatDate(row.data_pagamento)}</span>
            </div>
          )}
          {row.vencimento && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-600" />
              <span>Vence: {formatDate(row.vencimento)}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Cadastro',
      hideOnMobile: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (_: any, row: any) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditUser(row)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDeleteUser(row.id, row.full_name || row.email)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
            <p className="text-gray-600">Gerencie todos os usuários do Cataloguei</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshUsers} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={handleCreateUser}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="text-sm text-blue-800">
                <strong>Debug Info:</strong> {users.length} usuários carregados | Loading: {loading ? 'Sim' : 'Não'}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-600" />
                Usuários Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-600" />
                Usuários Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{inactiveUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-600" />
                Planos Anuais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{annualUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                Usuários Trial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{trialUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              data={users}
              columns={tableColumns}
              loading={loading}
              emptyMessage={searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            />
          </CardContent>
        </Card>

        {/* Formulário */}
        <UserForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingUser}
          mode={formMode}
        />
      </div>
    </AdminLayout>
  )
}

export default Admin