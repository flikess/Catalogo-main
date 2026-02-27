import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Clientes from "./pages/Clientes";
import Produtos from "./pages/Produtos";
import Pedidos from "./pages/Pedidos";
import PedidoDetalhes from "./pages/PedidoDetalhes";
import Configuracoes from "./pages/Configuracoes";
import Financeiro from "./pages/Financeiro";
import Estoque from "./pages/Estoque";
import Catalogos from "./pages/Catalogos";
import CatalogoPublico from "./pages/CatalogoPublico";
import CaktoSuccess from "./pages/CaktoSuccess";
import CaktoWebhookTest from "./pages/CaktoWebhookTest";
import CaktoSetup from "./pages/CaktoSetup";
import Pagamento from "./pages/Pagamento";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import FinalizarPedido from "./pages/Finalizar";
import TrialConta from "./pages/trialConta";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Página principal - Landing page de vendas */}
              <Route path="/" element={<Login />} />

              {/* Rotas públicas */}
              <Route path="/catalogo/:userId" element={<CatalogoPublico />} />
              <Route path="/finalizar" element={<FinalizarPedido />} />
              <Route path="/cakto/success" element={<CaktoSuccess />} />
              <Route path="/cakto/webhook-test" element={<CaktoWebhookTest />} />
              <Route path="/cakto/setup" element={<CaktoSetup />} />

              {/* Rota de pagamento (para usuários com assinatura expirada) */}
              <Route path="/pagamento" element={<Pagamento />} />

              {/* Rota administrativa */}
              <Route path="/admin" element={
                <ProtectedAdminRoute>
                  <Admin />
                </ProtectedAdminRoute>
              } />

              {/* Rotas de autenticação */}
              <Route path="/login" element={<Login />} />
              <Route path="/trial" element={<TrialConta />} />


              {/* Rotas protegidas */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/perfil" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute>
                  <Clientes />
                </ProtectedRoute>
              } />
              <Route path="/produtos" element={
                <ProtectedRoute>
                  <Produtos />
                </ProtectedRoute>
              } />
              <Route path="/pedidos" element={
                <ProtectedRoute>
                  <Pedidos />
                </ProtectedRoute>
              } />
              <Route path="/pedidos/:id" element={
                <ProtectedRoute>
                  <PedidoDetalhes />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute>
                  <Configuracoes />
                </ProtectedRoute>
              } />
              <Route path="/financeiro" element={
                <ProtectedRoute>
                  <Financeiro />
                </ProtectedRoute>
              } />
              <Route path="/estoque" element={
                <ProtectedRoute>
                  <Estoque />
                </ProtectedRoute>
              } />
              <Route path="/catalogos" element={
                <ProtectedRoute>
                  <Catalogos />
                </ProtectedRoute>
              } />
              <Route path="/:identifier" element={<CatalogoPublico />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
