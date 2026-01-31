import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  Package, 
  Warehouse, 
  Settings, 
  BookOpen, 
  LogOut,
  Menu,
  X,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess } from '@/utils/toast'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Pedidos', path: '/pedidos' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Package, label: 'Produtos', path: '/produtos' },
  { icon: Warehouse, label: 'Estoque', path: '/estoque' },
  { icon: BookOpen, label: 'Catálogos', path: '/catalogos' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
]

export const MobileSidebar = () => {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    showSuccess('Logout realizado com sucesso!')
    navigate('/login')
    setOpen(false)
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-accent"
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">CP</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Cataloguei</h2>
              <p className="text-xs text-muted-foreground">Sistema de Gestão</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4">
          <div className="space-y-1 px-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      Atual
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>
        </nav>
        
        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sair do Sistema</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
