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
  LogOut 
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess } from '@/utils/toast'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ShoppingCart, label: 'Pedidos', path: '/pedidos' },
  { icon: DollarSign, label: 'Financeiro', path: '/financeiro' },
  { icon: Users, label: 'Clientes', path: '/clientes' },
  { icon: Package, label: 'Produtos', path: '/produtos' },
  { icon: Warehouse, label: 'Estoque', path: '/estoque' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
  { icon: BookOpen, label: 'Catálogos', path: '/catalogos' },
]

export const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    showSuccess('Logout realizado com sucesso!')
    navigate('/login')
  }

  return (

<div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-40">
  <div className="p-6 border-b">
 <div className="flex items-center gap-2 justify-center">
 
 <img
      src="/logomob.png"
      alt="Logo"
      className="w-full h-full object-cover"
    />

</div>
  </div>

      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : ''
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          )
        })}
        
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors mt-4"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sair
        </button>
      </nav>
    </div>
  )
}
