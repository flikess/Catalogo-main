import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SubscriptionAlert } from '../SubscriptionAlert'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Alerta de Assinatura */}
      <SubscriptionAlert />
      
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <div className="lg:ml-64">
        <Header />
        <main className="p-3 sm:p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}