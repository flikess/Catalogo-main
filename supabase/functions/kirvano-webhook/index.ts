import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const body = await req.json()
        console.log('🚀 Kirvano Webhook - Processando:', body.event)

        if (body.event !== 'SALE_APPROVED' && body.event !== 'PURCHASE_APPROVED') {
            return new Response("Evento ignorado", { status: 200, headers: corsHeaders })
        }

        const nome = body.customer?.name
        const email = body.customer?.email
        const telefone = body.customer?.phone_number || null

        const plano = body.plan?.name ?? "Mensal"
        const pagoEm = body.payment?.finished_at ?? new Date().toISOString()
        const vencimento = body.plan?.next_charge_date
            ? new Date(body.plan.next_charge_date).toISOString()
            : new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

        const produtoPrincipal = body.products?.[0]?.name ?? ""

        if (!email || !nome) {
            return new Response("Dados incompletos", { status: 400, headers: corsHeaders })
        }

        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )

        // 1. Verificar se usuário já existe via Perfil ou Auth
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        let userId = profile?.id

        if (!userId) {
            // Criar novo usuário
            const senhaGerada = crypto.randomUUID().slice(0, 10)

            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: senhaGerada,
                email_confirm: true,
                user_metadata: {
                    nome,
                    origem: "kirvano",
                    plano,
                    data_pagamento: pagoEm,
                    vencimento,
                    phone: telefone,
                    produto: produtoPrincipal,
                    oferta: plano,
                    checkout_id: body.checkout_id,
                    sale_id: body.sale_id,
                },
            })

            if (authError || !newUser?.user?.id) {
                console.error('Erro Auth:', authError)
                return new Response("Erro ao criar usuário", { status: 500, headers: corsHeaders })
            }

            userId = newUser.user.id

            // Criar Perfil e Configurações iniciais
            try {
                await supabase.from('profiles').insert({
                    id: userId,
                    full_name: nome,
                    email: email,
                    phone: telefone,
                    created_at: new Date().toISOString()
                })

                await supabase.from('bakery_settings').insert({
                    id: userId,
                    bakery_name: `Catálogo de ${nome.split(' ')[0]}`,
                    email: email,
                    phone: telefone,
                    created_at: new Date().toISOString()
                })
            } catch (e) {
                console.error('Erro ao criar registros complementares:', e)
            }

            // Enviar e-mail (usando sua chave que funciona)
            const emailHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h1 style="color: #615999; text-align: center;">🧁 Bem-vindo(a) ao Cataloguei!</h1>
                    <p>Olá <strong>${nome}</strong>, sua conta foi criada com sucesso através da Kirvano!</p>
                    <div style="background: #f9f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>E-mail:</strong> ${email}</p>
                        <p><strong>Senha:</strong> ${senhaGerada}</p>
                        <p><strong>Plano:</strong> ${plano}</p>
                    </div>
                    <p style="text-align: center;">
                        <a href="https://app.catalogueii.com.br/login" style="background: #615999; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Acessar Meu Painel</a>
                    </p>
                </div>
            `

            await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: "Bearer re_EntrttGF_PWf3VEX9bGMonnqKRmqXvemo",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    from: "Cataloguei <suporte@catalogueii.com.br>",
                    to: email,
                    subject: "🚀 Seus dados de acesso ao Cataloguei",
                    html: emailHtml,
                }),
            })

        } else {
            // Atualizar usuário existente
            await supabase.auth.admin.updateUserById(userId, {
                user_metadata: {
                    nome,
                    origem: "kirvano",
                    plano,
                    data_pagamento: pagoEm,
                    vencimento,
                    phone: telefone,
                    updated_at: new Date().toISOString()
                },
            })

            // Atualizar telefone no perfil também
            await supabase.from('profiles')
                .update({ phone: telefone, updated_at: new Date().toISOString() })
                .eq('id', userId)
        }

        // Atualizar Assinatura
        const { error: assinaturaError } = await supabase
            .from("assinaturas")
            .upsert({
                user_id: userId,
                email,
                nome,
                plano,
                data_pagamento: pagoEm,
                vencimento,
                produto: produtoPrincipal,
                oferta: plano,
                origem: "kirvano",
                checkout_id: body.checkout_id,
                sale_id: body.sale_id
            }, { onConflict: 'user_id' })

        if (assinaturaError) {
            console.error('Erro Assinatura:', assinaturaError)
            return new Response("Erro ao salvar assinatura", { status: 500, headers: corsHeaders })
        }

        return new Response("Processado com sucesso", { status: 200, headers: corsHeaders })

    } catch (e) {
        console.error('Erro Geral:', e)
        return new Response("Erro interno", { status: 500, headers: corsHeaders })
    }
})
