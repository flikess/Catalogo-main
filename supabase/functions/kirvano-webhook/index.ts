import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kirvano-secret',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        console.log('🚀 Kirvano Webhook - Iniciando processamento')

        if (req.method !== 'POST') {
            return new Response(
                JSON.stringify({ error: 'Método não permitido' }),
                {
                    status: 405,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Validar cabeçalho de segurança (Opcional)
        const kirvanoSecret = req.headers.get('x-kirvano-secret')
        const expectedSecret = Deno.env.get('KIRVANO_WEBHOOK_SECRET') || 'sua-chave-secreta-aqui'

        if (kirvanoSecret && kirvanoSecret !== expectedSecret) {
            console.log('❌ Secret inválido')
            return new Response(
                JSON.stringify({ error: 'Não autorizado' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const payload = await req.json()
        console.log('📦 Payload Kirvano:', JSON.stringify(payload, null, 2))

        // Kirvano usa SALE_APPROVED para vendas aprovadas conforme payload real
        if (payload.event !== 'SALE_APPROVED' && payload.event !== 'PURCHASE_APPROVED') {
            return new Response(
                JSON.stringify({ message: 'Evento ignorado', event: payload.event }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Extração de dados do Kirvano baseada no payload real
        const customer = payload.customer
        const product = payload.products?.[0]
        const plan = payload.plan
        const paymentDate = payload.created_at ? new Date(payload.created_at.replace(' ', 'T')) : new Date()

        if (!customer?.email || !customer?.name) {
            return new Response(
                JSON.stringify({ error: 'Dados do cliente incompletos' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        console.log('👤 Processando cliente:', customer.email)
        console.log('🧁 Produto:', product?.name)
        console.log('📋 Plano:', plan?.name || 'Não informado')

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        })

        // Verificar se usuário já existe
        const { data: existingUserData } = await supabase.auth.admin.getUserByEmail(customer.email)
        const existingUser = existingUserData.user

        // Determinar plano e vencimento
        const planoOriginal = plan?.name || product?.name || 'Mensal'
        const plano = determinarPlano(planoOriginal)

        // Se a Kirvano já manda a data da próxima cobrança, usamos ela como vencimento
        const vencimentoStr = plan?.next_charge_date
            ? plan.next_charge_date.replace(' ', 'T')
            : calcularVencimento(paymentDate, plano).toISOString()
        const vencimento = new Date(vencimentoStr)

        let userId: string

        if (existingUser) {
            console.log('ℹ️ Usuário já existe, atualizando assinatura:', customer.email)
            userId = existingUser.id

            // Atualizar user_metadata
            await supabase.auth.admin.updateUserById(userId, {
                user_metadata: {
                    ...existingUser.user_metadata,
                    nome: customer.name,
                    plano,
                    data_pagamento: paymentDate.toISOString(),
                    vencimento: vencimento.toISOString(),
                    origem: 'kirvano',
                    updated_at: new Date().toISOString()
                }
            })
        } else {
            // Criar novo usuário
            console.log('🆕 Criando novo usuário:', customer.email)
            const temporaryPassword = crypto.randomUUID().slice(0, 10)

            const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
                email: customer.email,
                password: temporaryPassword,
                email_confirm: true,
                user_metadata: {
                    nome: customer.name,
                    full_name: customer.name,
                    phone: customer.phone_number || null,
                    origem: 'kirvano',
                    plano,
                    data_pagamento: paymentDate.toISOString(),
                    vencimento: vencimento.toISOString(),
                    created_at: new Date().toISOString()
                }
            })

            if (authError) {
                throw authError
            }

            userId = newUser.user!.id
            console.log('✅ Usuário criado:', userId)

            // Criar perfil e bakery_settings (ignora erros se tabelas não existirem)
            await supabase.from('profiles').insert({
                id: userId,
                full_name: customer.name,
                email: customer.email,
                created_at: new Date().toISOString()
            }).catch(() => { })

            await supabase.from('bakery_settings').insert({
                id: userId,
                bakery_name: `Catálogo de ${customer.name.split(' ')[0]}`,
                email: customer.email,
                phone: customer.phone_number || null,
                created_at: new Date().toISOString()
            }).catch(() => { })

            // Enviar e-mail de boas-vindas
            const resendApiKey = Deno.env.get('RESEND_API_KEY')
            if (resendApiKey) {
                try {
                    const emailHtml = `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #615999; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px; }
              .highlight { background: #f8f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e0dbff; }
              .button { display: inline-block; background: #615999; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🧁 Bem-vindo ao Cataloguei!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${customer.name}</strong>,</p>
                <p>Recebemos a confirmação do seu plano através da <strong>Kirvano</strong>. Sua jornada para vender mais começa agora!</p>
                
                <div class="highlight">
                  <h3 style="margin-top:0; color: #615999;">🔑 Dados de Acesso:</h3>
                  <p><strong>Link de Login:</strong> <a href="https://app.catalogueii.com.br/login">app.catalogueii.com.br/login</a></p>
                  <p><strong>E-mail:</strong> ${customer.email}</p>
                  <p><strong>Senha:</strong> ${temporaryPassword}</p>
                </div>

                <div class="highlight">
                  <h3 style="margin-top:0; color: #615999;">📊 Detalhes da Assinatura:</h3>
                  <p><strong>Plano:</strong> ${plano}</p>
                  <p><strong>Vencimento:</strong> ${vencimento.toLocaleDateString('pt-BR')}</p>
                </div>

                <p>Para sua segurança, recomendamos alterar sua senha assim que entrar no painel.</p>
                
                <div style="text-align: center;">
                  <a href="https://app.catalogueii.com.br/login" class="button">Acessar Meu Painel Agora</a>
                </div>

                <div class="footer">
                  <p>© ${new Date().getFullYear()} Cataloguei. Todos os direitos reservados.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
          `

                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendApiKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            from: 'Cataloguei <suporte@catalogueii.com.br>',
                            to: customer.email,
                            subject: '🚀 Bem-vindo ao Cataloguei - Credenciais de Acesso',
                            html: emailHtml,
                        }),
                    })
                    console.log('✅ E-mail de boas-vindas enviado')
                } catch (e) {
                    console.error('❌ Erro ao enviar e-mail:', e)
                }
            }
        }

        // Inserir/Atualizar assinatura (Upsert)
        const { error: subscriptionError } = await supabase
            .from('assinaturas')
            .upsert({
                user_id: userId,
                email: customer.email,
                nome: customer.name,
                plano,
                data_pagamento: paymentDate.toISOString(),
                vencimento: vencimento.toISOString(),
                produto: product?.name || plan?.name || 'Kirvano Product',
                oferta: plan?.name || product?.name || 'Kirvano Offer'
            }, {
                onConflict: 'user_id'
            })

        if (subscriptionError) {
            console.error('❌ Erro ao salvar assinatura:', subscriptionError)
        } else {
            console.log('✅ Assinatura salva com sucesso')
        }

        return new Response(
            JSON.stringify({ success: true, message: 'Webhook Kirvano processado', user_id: userId }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('💥 Erro Kirvano:', error)
        return new Response(
            JSON.stringify({ error: 'Erro interno', details: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})

function determinarPlano(productName?: string): string {
    if (!productName) return 'Mensal'
    const name = productName.toLowerCase()
    if (name.includes('anual') || name.includes('ano') || name.includes('12 meses')) return 'Anual'
    if (name.includes('trimestral')) return 'Trimestral'
    return 'Mensal'
}

function calcularVencimento(startDate: Date, plano: string): Date {
    const date = new Date(startDate)
    if (plano === 'Anual') {
        date.setFullYear(date.getFullYear() + 1)
    } else if (plano === 'Trimestral') {
        date.setMonth(date.getMonth() + 3)
    } else {
        date.setMonth(date.getMonth() + 1)
    }
    return date
}
