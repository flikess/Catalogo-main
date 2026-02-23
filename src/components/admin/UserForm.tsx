import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Eye, EyeOff } from 'lucide-react'
import { showError } from '@/utils/toast'

interface UserFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  initialData?: any
  mode: 'create' | 'edit'
}

export const UserForm = ({ isOpen, onClose, onSubmit, initialData, mode }: UserFormProps) => {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    full_name: initialData?.full_name || '',
    plano: initialData?.plano || 'Mensal',
    data_pagamento: initialData?.data_pagamento ?
      new Date(initialData.data_pagamento).toISOString().split('T')[0] :
      new Date().toISOString().split('T')[0],
    vencimento: initialData?.vencimento ?
      new Date(initialData.vencimento).toISOString().split('T')[0] :
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('📝 Submetendo formulário:', { mode, formData })

    // Validações
    if (!formData.full_name.trim()) {
      showError('Nome completo é obrigatório')
      return
    }

    if (!formData.email.trim()) {
      showError('E-mail é obrigatório')
      return
    }

    // Validar formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      showError('E-mail deve ter um formato válido')
      return
    }

    if (mode === 'create' && !formData.password.trim()) {
      showError('Senha é obrigatória para novos usuários')
      return
    }

    if (!formData.data_pagamento) {
      showError('Data de pagamento é obrigatória')
      return
    }

    if (!formData.vencimento) {
      showError('Data de vencimento é obrigatória')
      return
    }

    setLoading(true)

    try {
      console.log('🚀 Enviando dados para o hook...')
      await onSubmit(formData)
      onClose()
      setFormData({
        email: '',
        password: '',
        full_name: '',
        plano: 'Mensal',
        data_pagamento: new Date().toISOString().split('T')[0],
        vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('❌ Erro no formulário:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password })
  }

  const calculateVencimento = (plano: string, dataPagamento: string) => {
    const data = new Date(dataPagamento)
    if (plano === 'Anual') {
      data.setDate(data.getDate() + 365)
    } else if (plano === 'Trial') {
      data.setDate(data.getDate() + 2)
    } else {
      data.setDate(data.getDate() + 30)
    }
    return data.toISOString().split('T')[0]

  }

  const handlePlanoChange = (plano: string) => {
    const novoVencimento = calculateVencimento(plano, formData.data_pagamento)
    setFormData({
      ...formData,
      plano,
      vencimento: novoVencimento
    })
  }

  const handleDataPagamentoChange = (data: string) => {
    const novoVencimento = calculateVencimento(formData.plano, data)
    setFormData({
      ...formData,
      data_pagamento: data,
      vencimento: novoVencimento
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Criar Novo Usuário' : 'Editar Usuário'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Nome completo do usuário"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
              required
            />
            {mode === 'edit' && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Alterar o e-mail pode afetar o login do usuário
              </p>
            )}
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Senha do usuário"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  size="sm"
                >
                  Gerar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="plano">Plano *</Label>
            <Select value={formData.plano} onValueChange={handlePlanoChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Mensal">Mensal</SelectItem>
                <SelectItem value="Anual">Anual</SelectItem>
                <SelectItem value="Trial">Trial</SelectItem>

              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="data_pagamento">Data Pagamento *</Label>
              <Input
                id="data_pagamento"
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => handleDataPagamentoChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input
                id="vencimento"
                type="date"
                value={formData.vencimento}
                onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Salvando...' : mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}