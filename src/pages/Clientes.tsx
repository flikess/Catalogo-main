import { useState, useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, User } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'
import { showSuccess, showError } from '@/utils/toast'

interface Client {
  id: string
  name: string
  cpf?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  created_at: string
}

const Clientes = () => {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    address: '',
    city: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      showError('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingClient.id)

        if (error) throw error
        showSuccess('Cliente atualizado com sucesso!')
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            ...formData,
            user_id: user?.id
          })

        if (error) throw error
        showSuccess('Cliente criado com sucesso!')
      }

      setIsDialogOpen(false)
      setEditingClient(null)
      resetForm()
      fetchClients()
    } catch (error) {
      console.error('Error saving client:', error)
      showError('Erro ao salvar cliente')
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      cpf: client.cpf || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || ''
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error
      showSuccess('Cliente excluído com sucesso!')
      fetchClients()
    } catch (error) {
      console.error('Error deleting client:', error)
      showError('Erro ao excluir cliente')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      cpf: '',
      email: '',
      phone: '',
      address: '',
      city: ''
    })
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  )

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const tableColumns = [
    {
      key: 'name',
      label: 'Nome',
      render: (value: string, row: Client) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">{value}</div>
            {row.cpf && (
              <div className="text-sm text-muted-foreground">CPF: {row.cpf}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Contato',
      render: (_: any, row: Client) => (
        <div className="space-y-1">
          {row.email && (
            <div className="flex items-center text-sm">
              <Mail className="w-3 h-3 mr-1.5" />
              {row.email}
            </div>
          )}
          {row.phone && (
            <div className="flex items-center text-sm">
              <Phone className="w-3 h-3 mr-1.5" />
              {row.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'location',
      label: 'Localização',
      hideOnMobile: true,
      render: (_: any, row: Client) => {
        if (!row.address && !row.city) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex items-start text-sm">
            <MapPin className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" />
            <div>
              <div>{row.address}</div>
              {row.city && <div className="text-muted-foreground">{row.city}</div>}
            </div>
          </div>
        )
      }
    },
    {
      key: 'created_at',
      label: 'Cadastro',
      mobileLabel: 'Data Cadastro',
      render: (value: string) => (
        <Badge variant="outline">
          {formatDate(value)}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: 'Ações',
      className: 'text-right',
      render: (_: any, row: Client) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(row.id)}
            className="text-destructive hover:text-destructive"
          >
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
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingClient(null) }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="cliente@email.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, bairro"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cidade - UF"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingClient ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes ({filteredClients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveTable
              data={filteredClients}
              columns={tableColumns}
              loading={loading}
              emptyMessage={searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default Clientes