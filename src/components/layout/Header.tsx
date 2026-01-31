import { useState, useEffect } from 'react'
import { User, Settings, LogOut, Menu } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { showSuccess } from '@/utils/toast'
import { MobileSidebar } from './MobileSidebar'
import { ThemeSelector } from './ThemeSelector'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const Header = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<{ full_name?: string; avatar_url?: string } | null>(null)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    showSuccess('Logout realizado com sucesso!')
    navigate('/login')
  }

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Left Side - Mobile Menu + Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden">
            <MobileSidebar />
          </div>
          
          {/* Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
              <span className="lg:hidden">Confeitaria Pro</span>
              <span className="hidden lg:block">Bem-vindo ao seu sistema</span>
            </h1>
          </div>
        </div>
        
        {/* Right Side - Theme + User Menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Selector */}
          <div className="hidden sm:block">
            <ThemeSelector />
          </div>
          
          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-accent"
              >
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                  <AvatarImage src={profile?.avatar_url} alt="Avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                    {user?.email ? getInitials(profile?.full_name || '', user.email) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56">
              {/* User Info */}
              <div className="px-2 py-1.5 text-sm">
                <div className="font-medium truncate">
                  {profile?.full_name || 'Usuário'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
              </div>
              
              <div className="h-px bg-border my-1" />
              
              {/* Theme Selector for Mobile */}
              <div className="sm:hidden px-2 py-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">Tema</div>
                <ThemeSelector />
              </div>
              
              <div className="h-px bg-border my-1 sm:hidden" />
              
              {/* Menu Items */}
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <User className="w-4 h-4 mr-2" />
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}