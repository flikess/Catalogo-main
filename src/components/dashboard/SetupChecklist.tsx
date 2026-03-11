import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Circle, ArrowRight, Store, Image as ImageIcon, Phone, CreditCard, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/components/auth/AuthProvider'

interface SetupStep {
    id: string
    label: string
    description: string
    icon: any
    completed: boolean
    link: string
}

export const SetupChecklist = ({ productCount }: { productCount: number }) => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [settings, setSettings] = useState<any>(null)
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        if (user) {
            fetchSettings()
        }
    }, [user])

    const fetchSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('bakery_settings')
                .select('*')
                .eq('id', user?.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error
            setSettings(data)
        } catch (error) {
            console.error('Error fetching settings for checklist:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !user) return null

    const steps: SetupStep[] = [
        {
            id: 'business_info',
            label: 'Dados da Loja',
            description: 'Nome, endereço e descrição',
            icon: Store,
            completed: !!settings?.bakery_name && !!settings?.address_city,
            link: '/configuracoes'
        },
        {
            id: 'business_type',
            label: 'Ramo do Negócio',
            description: 'Defina o segmento da sua loja',
            icon: Store,
            completed: !!settings?.business_type,
            link: '/configuracoes'
        },
        {
            id: 'logo',
            label: 'Logo da Loja',
            description: 'Envie sua marca para o catálogo',
            icon: ImageIcon,
            completed: !!settings?.logo_url,
            link: '/configuracoes'
        },
        {
            id: 'phone',
            label: 'WhatsApp',
            description: 'Configure para receber pedidos',
            icon: Phone,
            completed: !!settings?.phone,
            link: '/configuracoes'
        },
        {
            id: 'pix',
            label: 'Chave PIX',
            description: 'Configure seus dados de pagamento',
            icon: CreditCard,
            completed: !!settings?.pix_key,
            link: '/configuracoes'
        },
        {
            id: 'product',
            label: 'Primeiro Produto',
            description: 'Cadastre um item para vender',
            icon: Package,
            completed: productCount > 0,
            link: '/produtos'
        }
    ]

    const completedSteps = steps.filter(step => step.completed).length
    const progressPercent = (completedSteps / steps.length) * 100
    const isAllCompleted = completedSteps === steps.length

    if (isAllCompleted && !isVisible) return null

    return (
        <Card className={`border-purple-100 shadow-sm transition-all duration-300 ${isAllCompleted ? 'bg-green-50/50' : 'bg-gradient-to-br from-white to-purple-50/30'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-900">
                        {isAllCompleted ? (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Sua loja está pronta!
                            </span>
                        ) : (
                            '🚀 Complete sua configuração'
                        )}
                    </CardTitle>
                    <span className="text-xs font-semibold px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {completedSteps} de {steps.length} concluídos
                    </span>
                </div>
                {!isAllCompleted && (
                    <div className="mt-2 space-y-1">
                        <Progress value={progressPercent} className="h-2 bg-purple-100" />
                        <p className="text-xs text-purple-600 font-medium">
                            Faltam apenas {steps.length - completedSteps} passos para sua loja ficar perfeita.
                        </p>
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            onClick={() => navigate(step.link)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.02]
                ${step.completed
                                    ? 'bg-white/50 border-green-100 text-green-700'
                                    : 'bg-white border-purple-100 shadow-sm hover:border-purple-300'
                                }`}
                        >
                            <div className={`p-2 rounded-lg ${step.completed ? 'bg-green-100' : 'bg-purple-100'}`}>
                                <step.icon className={`w-4 h-4 ${step.completed ? 'text-green-600' : 'text-purple-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{step.label}</p>
                                <p className="text-[10px] opacity-70 truncate">{step.description}</p>
                            </div>
                            {step.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : (
                                <ArrowRight className="w-4 h-4 text-purple-300 flex-shrink-0" />
                            )}
                        </div>
                    ))}
                </div>

                {isAllCompleted && (
                    <div className="mt-4 flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => setIsVisible(false)}
                        >
                            Dispensar aviso
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
