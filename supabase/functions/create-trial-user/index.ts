import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    // Tratando CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, full_name, business_name, phone, business_type } = await req.json()

        // 1. Calcular vencimento de 2 dias no servidor
        const vencimento = new Date()
        vencimento.setDate(vencimento.getDate() + 2)
        const vencimentoIso = vencimento.toISOString()

        // 2. Criar usuário com metadados
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                business_name,
                phone, // <-- Salvando o WhatsApp no metadado do Auth
                business_type,
                plano: 'Trial',
                vencimento: vencimentoIso,
                role: 'user'
            }
        })

        if (authError) throw authError
        const userId = authData.user.id

        // 3. Criar perfil na tabela profiles
        const { error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
                id: userId,
                full_name,
                email,
                phone, // <-- Salvando o WhatsApp na tabela profiles
                updated_at: new Date().toISOString()
            })

        if (profileError) console.error('Erro ao criar perfil:', profileError)

        // 4. Criar registro na tabela assinaturas
        const { error: assinaturaError } = await supabaseClient
            .from('assinaturas')
            .upsert({
                user_id: userId,
                email: email,
                nome: full_name,
                plano: 'Trial',
                vencimento: vencimentoIso,
                data_pagamento: new Date().toISOString()
            })

        if (assinaturaError) console.error('Erro ao criar assinatura:', assinaturaError)

        // 5. Configurar bakery_settings (Loja)
        const { error: bakeryError } = await supabaseClient
            .from('bakery_settings')
            .upsert({
                id: userId,
                bakery_name: business_name,
                email: email,
                phone: phone, // <-- Salvando o WhatsApp na configuração da loja
                business_type,
                created_at: new Date().toISOString()
            })

        if (bakeryError) console.error('Erro ao configurar bakery_settings:', bakeryError)

        return new Response(
            JSON.stringify({ message: "Usuário Trial criado com sucesso", user: authData.user }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        let errorMessage = error.message

        if (
            errorMessage.includes('already been registered') ||
            errorMessage.includes('already exists') ||
            errorMessage.includes('User already registered')
        ) {
            errorMessage = 'Este e-mail já está cadastrado em nosso sistema.'
        } else if (errorMessage.includes('Password should be')) {
            errorMessage = 'A senha deve ter pelo menos 6 caracteres.'
        }

        return new Response(
            JSON.stringify({ error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
