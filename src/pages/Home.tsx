import React, { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Star, Users, TrendingUp, Shield, Zap, Crown, ArrowRight, ShoppingCart, Package, Warehouse, PlayCircle, Image as ImageIcon } from 'lucide-react'

/**
 * Substitua essa constante pela URL da sua própria imagem de banner.
 * Pode ser um caminho local (por exemplo: /images/banner.jpg) ou um URL absoluto.
 */
const HERO_IMAGE_URL = 'COLE_AQUI_SUA_IMAGE_URL'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const planosRef = useRef<HTMLElement | null>(null)

  const features = [
    {
      icon: ShoppingCart,
      title: 'Gestão de Pedidos',
      description: 'Controle completo de orçamentos, pedidos confirmados e entregas'
    },
    {
      icon: Users,
      title: 'Cadastro de Clientes',
      description: 'Organize seus clientes com histórico completo de compras'
    },
    {
      icon: Package,
      title: 'Catálogo de Produtos',
      description: 'Crie catálogos online para seus clientes visualizarem'
    },
    {
      icon: TrendingUp,
      title: 'Relatórios Financeiros',
      description: 'Acompanhe faturamento, ticket médio e performance'
    },
    {
      icon: Warehouse,
      title: 'Controle de Estoque',
      description: 'Gerencie ingredientes e produtos com alertas de estoque baixo'
    },
    {
      icon: Zap,
      title: 'WhatsApp Integrado',
      description: 'Envie pedidos e catálogos direto pelo WhatsApp'
    }
  ]

  const testimonials = [
    {
      name: 'Maria Silva',
      business: 'Doces da Maria',
      text: 'Aumentei minhas vendas em 40% depois que comecei a usar o Confeitaria Pro!',
      rating: 5
    },
    {
      name: 'João Santos',
      business: 'Bolos do João',
      text: 'Finalmente consigo organizar todos os meus pedidos em um só lugar.',
      rating: 5
    },
    {
      name: 'Ana Costa',
      business: 'Confeitaria Ana',
      text: 'O catálogo online me ajudou a conquistar novos clientes.',
      rating: 5
    }
  ]

  const plans = [
    {
      name: 'Mensal',
      price: 'R$ 19,90',
      period: '/mês',
      description: 'Perfeito para começar',
      features: [
        'Gestão completa de pedidos',
        'Cadastro ilimitado de clientes',
        'Controle de estoque',
        'Relatórios financeiros',
        'Catálogos online',
        'Suporte por email'
      ],
      popular: false,
      link: 'https://pay.cakto.com.br/fk98ct3'
    },
    {
      name: 'Anual',
      price: 'R$ 97,90',
      period: '/ano',
      description: 'Melhor custo-benefício',
      features: [
        'Todos os recursos do mensal',
        'Economize R$ 140,90',
        'Suporte prioritário',
        'Recursos exclusivos',
        'Sem preocupação por 1 ano',
        'Atualizações gratuitas'
      ],
      popular: true,
      link: 'https://pay.cakto.com.br/xc5mxv4'
    }
  ]

  const scrollToPlanos = () => {
    planosRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen font-sans text-gray-900">
      {/* Hidden image for accessibility/SEO (screen-reader visible) */}
      <img src={HERO_IMAGE_URL} alt="Banner Confeitaria Pro" className="sr-only" />

      {/* Header - transparente sobre o hero, igual ao exemplo */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center shadow">
                <span className="text-white font-bold">CP</span>
              </div>
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
                Confeitaria Pro
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-4">
              <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Início
              </Button>
              <Button variant="ghost" onClick={() => scrollToPlanos()}>
                Planos
              </Button>
              <Button variant="outline" onClick={() => navigate('/login')}>
                Entrar
              </Button>
              <Button onClick={() => navigate('/trial')} className="ml-2 bg-gradient-to-r from-purple-600 to-pink-600">
                Teste Grátis
              </Button>
              <Button onClick={scrollToPlanos} className="ml-2 bg-gradient-to-r from-pink-500 to-purple-600">
                Assinar Agora
              </Button>

            </nav>

            <div className="md:hidden">
              <Button variant="outline" onClick={() => navigate('/login')}>Entrar</Button>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section
        className="relative pt-24 lg:pt-28 pb-20"
        aria-label="Seção principal"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.06), rgba(255,255,255,0.06)), url(${HERO_IMAGE_URL})` }}
        />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="py-12 lg:py-20">
              <Badge className="mb-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white">Sistema Completo para Confeitarias</Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Transforme sua <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">Confeitaria</span> em um Negócio Profissional
              </h1>

              <p className="text-lg text-gray-700 mb-6 max-w-xl">
                Gerencie pedidos, clientes, estoque e financeiro em uma plataforma completa. Crie catálogos online e aumente suas vendas com o Confeitaria Pro.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="inline-flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg shadow-purple-200" onClick={() => navigate('/trial')}>
                  <Zap className="w-5 h-5 mr-2" /> Começar Teste Grátis
                </Button>
                <Button variant="outline" size="lg" onClick={scrollToPlanos}>
                  <Crown className="w-5 h-5 mr-2" /> Ver Planos
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate('/login')}>Já tenho conta</Button>
              </div>


              <p className="text-sm text-gray-500 mt-4">✅ Sem compromisso • ✅ Cancele quando quiser • ✅ Suporte incluído</p>
            </div>

            <div className="py-8 lg:py-20">
              <div className="bg-white rounded-2xl shadow-xl p-6 border">
                <h3 className="text-lg font-semibold mb-4">Demo rápida</h3>
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                  <PlayCircle className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 mt-4">Assista a uma demonstração curta para ver como o Confeitaria Pro facilita seu dia a dia.</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="ghost">Ver Demo</Button>
                  <Button onClick={() => scrollToPlanos()} className="ml-auto bg-gradient-to-r from-pink-500 to-purple-600">Planos</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 bg-white -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Tudo que você precisa em um só lugar</h2>
            <p className="text-gray-600 mt-2">Recursos profissionais para fazer sua confeitaria crescer</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-gradient-to-r from-pink-500 to-purple-600">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">Confeiteiros que já transformaram seus negócios</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <Card key={idx} className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{t.text}"</p>
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section ref={planosRef as any} className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Planos que cabem no seu bolso</h2>
            <p className="text-gray-600 mt-2">Escolha o plano ideal para sua confeitaria</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mt-8">
              {plans.map((plan, i) => (
                <Card key={i} className={`relative p-6 ${plan.popular ? 'border-2 border-purple-500 shadow-xl' : 'shadow'} rounded-2xl`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">💰 Mais Popular</Badge>
                    </div>
                  )}

                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="text-4xl font-extrabold text-gray-900 mt-2">
                      {plan.price}
                      <span className="text-lg font-medium text-gray-500"> {plan.period}</span>
                    </div>
                    <p className="text-gray-600 mt-2">{plan.description}</p>
                  </CardHeader>

                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                          <span className="text-gray-600">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex gap-2">
                      <Button className={`flex-1 ${plan.popular ? 'bg-gradient-to-r from-pink-500 to-purple-600' : ''}`} onClick={() => window.open(plan.link, '_blank')}>
                        Escolher {plan.name}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button variant="ghost" onClick={() => alert('Fale com a gente pelo WhatsApp!')}>Fale com a gente</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-r from-pink-500 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 rounded-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Pronto para transformar sua confeitaria?</h2>
          <p className="text-lg text-pink-100 mb-6">Junte-se a centenas de confeiteiros que já profissionalizaram seus negócios</p>
          <Button size="lg" className="bg-white text-purple-600" onClick={scrollToPlanos}>
            <Crown className="w-5 h-5 mr-2" /> Assinar Agora
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">CP</span>
            </div>
            <div>
              <p className="font-bold">Confeitaria Pro</p>
              <p className="text-sm text-gray-400">O sistema completo para profissionalizar sua confeitaria</p>
            </div>
          </div>

          <div className="text-sm text-gray-400">© 2025 Confeitaria Pro • Todos os direitos reservados</div>
        </div>
      </footer>
    </div>
  )
}

export default Home
