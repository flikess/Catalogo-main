import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { showSuccess, showError } from '@/utils/toast'
import { Clock, ShieldCheck, Zap, ArrowLeft, UserPlus } from 'lucide-react'
import { BUSINESS_TYPES } from '@/utils/business-types'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const TrialConta = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [loading, setLoading] = useState(false)

    const maskPhone = (value: string) => {
        if (!value) return ''
        const rawValue = value.replace(/\D/g, '').slice(0, 11)
        if (rawValue.length <= 10) {
            return rawValue
                .replace(/^(\d{2})(\d)/, '($1) $2')
                .replace(/(\d{4})(\d)/, '$1-$2')
        }
        return rawValue
            .replace(/^(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
    }

    const [formData, setFormData] = useState({
        email: searchParams.get('email') || searchParams.get('em') || '',
        password: '',
        fullName: searchParams.get('name') || searchParams.get('nome') || 
                  (searchParams.get('fn') ? `${searchParams.get('fn')} ${searchParams.get('ln') || ''}`.trim() : ''),
        businessName: '',
        phone: maskPhone(searchParams.get('whatsapp') || searchParams.get('phone') || searchParams.get('ph') || ''),
        businessType: 'confeitaria'
    })

    // Efeito para preencher dados da URL (somente na montagem inicial)
    useEffect(() => {
        const urlEmail = searchParams.get('email') || searchParams.get('em')
        const fn = searchParams.get('fn')
        const ln = searchParams.get('ln')
        const nameFromUrl = searchParams.get('name') || searchParams.get('nome')
        const urlFullName = nameFromUrl || (fn ? `${fn} ${ln || ''}`.trim() : null)
        const urlWhatsapp = searchParams.get('whatsapp') || searchParams.get('phone') || searchParams.get('ph')

        if (urlEmail || urlFullName || urlWhatsapp) {
            setFormData(prev => ({
                ...prev,
                email: urlEmail || prev.email,
                fullName: urlFullName || prev.fullName,
                phone: urlWhatsapp ? maskPhone(urlWhatsapp) : prev.phone
            }))
        }
    }, []) // Excluímos searchParams para rodar apenas UMA vez no carregamento

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target
        if (id === 'phone') {
            setFormData(prev => ({ ...prev, [id]: maskPhone(value) }))
            return
        }
        setFormData(prev => ({ ...prev, [id]: value }))
    }

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // 1. Chamar a Edge Function para criar o usuário com vencimento seguro
            const { data, error: functionError } = await supabase.functions.invoke('create-trial-user', {
                body: {
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.fullName,
                    business_name: formData.businessName,
                    phone: formData.phone,
                    business_type: formData.businessType
                }
            })

            if (functionError) {
                console.error('Erro na Edge Function:', functionError)

                let message = 'Ocorreu um erro ao criar sua conta. Tente novamente.'

                // Tenta buscar a mensagem de erro específica retornada pelo Supabase
                try {
                    // Algumas versões retornam erro no corpo da resposta
                    if ((functionError as any).context) {
                        const errorResponse = (functionError as any).context
                        const errorJson = await errorResponse.json()
                        message = errorJson.error || errorJson.message || message
                    } else {
                        // Outras versões retornam direto no objeto de erro
                        message = functionError.message || message
                    }
                } catch (e) {
                    console.error('Erro ao extrair corpo da mensagem:', e)
                    message = functionError.message || message
                }

                throw new Error(message)
            }

            // 2. Fazer login automático após a criação
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            })

            if (signInError) throw signInError

            try {
                if (window.dataLayer) {
                    window.dataLayer.push({
                        'event': 'form_trial_submit',
                        'user_data': {
                            'email': formData.email,
                            'name': formData.fullName,
                            'phone': formData.phone,
                            'business_name': formData.businessName,
                            'business_type': formData.businessType
                        },
                        'custom_data': {
                            'trial_duration': '2_days',
                            'product_name': 'Cataloguei'
                        }
                    });
                }
            } catch (gtmError) {
                console.error('Erro ao enviar evento para o GTM:', gtmError);
            }

            showSuccess('Conta Trial criada com sucesso! Aproveite seus 2 dias de acesso.')
            navigate('/dashboard')
        } catch (error: any) {
            console.error('Erro no cadastro trial:', error)

            // Tradução de erros comuns do Supabase para o usuário
            let userMessage = error.message || 'Erro ao criar conta trial'

            if (
                userMessage.includes('already been registered') ||
                userMessage.includes('already exists') ||
                userMessage.includes('User already registered')
            ) {
                userMessage = 'Este e-mail já está cadastrado em nosso sistema.'
            } else if (userMessage.includes('Password should be')) {
                userMessage = 'A senha deve ter pelo menos 6 caracteres.'
            }

            showError(userMessage)
        } finally {
            setLoading(false)
        }

    }


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 px-4 py-8 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Header Section */}
                <div className="text-center">
                    <Button
                        variant="ghost"
                        className="mb-4 text-gray-500 hover:text-gray-700"
                        onClick={() => navigate('/login')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar para Login
                    </Button>

                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-purple-100">
                            <Zap className="w-10 h-10 text-purple-600 fill-purple-100" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Teste Grátis por <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">2 Dias</span>
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Experimente todas as funcionalidades do Cataloguei agora mesmo.
                    </p>
                </div>

                {/* Benefits Card */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                        <div className="bg-green-100 p-1.5 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Acesso total ao sistema</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                        <div className="bg-blue-100 p-1.5 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">Sem necessidade de cartão</span>
                    </div>
                </div>

                {/* Form Card */}
                <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-md">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Criar sua conta</CardTitle>
                        <CardDescription className="text-center">
                            Leve sua produção para o próximo nível.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignUp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Nome Completo</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Seu nome"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="businessName">Nome da sua Confeitaria / Negócio</Label>
                                <Input
                                    id="businessName"
                                    type="text"
                                    placeholder="Ex: Doces da Maria"
                                    value={formData.businessName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Ramo do seu negócio</Label>
                                <Select
                                    value={formData.businessType}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
                                >
                                    <SelectTrigger className="w-full bg-white border-2 border-gray-100 h-12 rounded-xl focus:ring-2 focus:ring-purple-100 transition-all">
                                        <SelectValue placeholder="Selecione o ramo do seu negócio" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BUSINESS_TYPES.map((type) => (
                                            <SelectItem key={type.id} value={type.id}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">WhatsApp</Label>
                                <Input
                                    id="phone"
                                    type="text"
                                    placeholder="(00) 00000-0000"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="nome@exemplo.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                />
                            </div>

                            <Button
                                id="form_trial_submit"
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 shadow-lg shadow-purple-200 transition-all duration-200 hover:scale-[1.02]"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Criando conta...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <UserPlus className="w-5 h-5" />
                                        Começar Teste Grátis
                                    </div>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Já tem uma conta?{' '}
                                <Button
                                    variant="link"
                                    className="p-0 h-auto text-purple-600 font-semibold hover:text-purple-700"
                                    onClick={() => navigate('/login')}
                                >
                                    Entrar agora
                                </Button>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer info */}
                <p className="text-center text-xs text-gray-400 mt-8">
                    Ao se cadastrar, você concorda com nossos termos de uso e política de privacidade.
                </p>
            </div>
        </div>
    )
}

export default TrialConta
