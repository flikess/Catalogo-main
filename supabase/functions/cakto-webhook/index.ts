import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cakto-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 Cakto Webhook - Iniciando processamento')
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar cabeçalho de segurança
    const caktoSecret = req.headers.get('x-cakto-secret')
    const expectedSecret = 'a646b650-8839-471e-b36f-dc1288eb47b4'
    
    if (!caktoSecret || caktoSecret !== expectedSecret) {
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
    console.log('📦 Payload:', JSON.stringify(payload, null, 2))

    if (payload.event !== 'payment.confirmed') {
      return new Response(
        JSON.stringify({ message: 'Evento ignorado', event: payload.event }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const customer = payload.data?.customer
    const payment = payload.data?.payment
    const offer = payload.data?.offer
    const product = payload.data?.product

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
    console.log('💳 Dados do pagamento:', payment)
    console.log('🎯 Oferta:', offer)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verificar se usuário já existe
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(customer.email)
    
    if (existingUser.user) {
      console.log('ℹ️ Usuário já existe, atualizando assinatura:', customer.email)
      
      // Processar dados da assinatura para usuário existente
      const dataPagamento = new Date()
      const plano = determinarPlano(offer?.name)
      const vencimento = calcularVencimento(dataPagamento, plano)

      // Atualizar user_metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.user.id,
        {
          user_metadata: {
            ...existingUser.user.user_metadata,
            plano,
            data_pagamento: dataPagamento.toISOString(),
            vencimento: vencimento.toISOString(),
            payment_id: payment?.id,
            updated_at: new Date().toISOString()
          }
        }
      )

      if (updateError) {
        console.error('❌ Erro ao atualizar user_metadata:', updateError)
      }

      // Inserir/atualizar na tabela assinaturas
      const { error: subscriptionError } = await supabase
        .from('assinaturas')
        .upsert({
          user_id: existingUser.user.id,
          email: customer.email,
          nome: customer.name,
          plano,
          data_pagamento: dataPagamento.toISOString(),
          vencimento: vencimento.toISOString(),
          produto: product?.name || null,
          oferta: offer?.name || null
        })

      if (subscriptionError) {
        console.error('❌ Erro ao salvar assinatura:', subscriptionError)
      }

      return new Response(
        JSON.stringify({ 
          message: 'Assinatura atualizada para usuário existente', 
          user_id: existingUser.user.id,
          plano,
          vencimento: vencimento.toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Processar dados da assinatura para novo usuário
    const dataPagamento = new Date()
    const plano = determinarPlano(offer?.name)
    const vencimento = calcularVencimento(dataPagamento, plano)

    console.log('📅 Plano determinado:', plano)
    console.log('📅 Data de pagamento:', dataPagamento.toISOString())
    console.log('📅 Data de vencimento:', vencimento.toISOString())

    // Gerar senha aleatória
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
      let password = ''
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return password
    }

    const temporaryPassword = generatePassword()
    console.log('🔑 Senha temporária gerada')

    // Criar usuário no Supabase Auth com dados da assinatura
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: customer.email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: customer.name,
        phone: customer.phone || null,
        created_via: 'cakto_webhook',
        payment_id: payment?.id,
        plano,
        data_pagamento: dataPagamento.toISOString(),
        vencimento: vencimento.toISOString(),
        created_at: new Date().toISOString()
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário:', authError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário', details: authError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Usuário criado:', newUser.user?.id)

    // Criar perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user!.id,
        full_name: customer.name,
        email: customer.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('⚠️ Erro ao criar perfil:', profileError)
    } else {
      console.log('✅ Perfil criado')
    }

    // Criar configurações da confeitaria
    const { error: settingsError } = await supabase
      .from('bakery_settings')
      .insert({
        id: newUser.user!.id,
        bakery_name: `Confeitaria de ${customer.name.split(' ')[0]}`,
        email: customer.email,
        phone: customer.phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (settingsError) {
      console.error('⚠️ Erro ao criar configurações:', settingsError)
    } else {
      console.log('✅ Configurações criadas')
    }

    // Inserir dados da assinatura na tabela
    const { error: subscriptionError } = await supabase
      .from('assinaturas')
      .insert({
        user_id: newUser.user!.id,
        email: customer.email,
        nome: customer.name,
        plano,
        data_pagamento: dataPagamento.toISOString(),
        vencimento: vencimento.toISOString(),
        produto: product?.name || null,
        oferta: offer?.name || null
      })

    if (subscriptionError) {
      console.error('⚠️ Erro ao criar assinatura:', subscriptionError)
    } else {
      console.log('✅ Assinatura criada')
    }

    // Enviar e-mail de boas-vindas
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    
    if (resendApiKey) {
      try {
        const emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao Confeitaria Pro</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .subscription { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🧁 Bem-vindo ao Confeitaria Pro!</h1>
            <p>Sua conta foi criada com sucesso</p>
          </div>
          
          <div class="content">
            <h2>Olá, ${customer.name}!</h2>
            
            <p>Parabéns! Sua compra foi aprovada e sua conta no <strong>Confeitaria Pro</strong> foi criada automaticamente.</p>
            
            <div class="subscription">
              <h3>📋 Detalhes da sua Assinatura:</h3>
              <p><strong>Plano:</strong> ${plano}</p>
              <p><strong>Data de Pagamento:</strong> ${dataPagamento.toLocaleDateString('pt-BR')}</p>
              <p><strong>Válido até:</strong> ${vencimento.toLocaleDateString('pt-BR')}</p>
              ${offer?.name ? `<p><strong>Oferta:</strong> ${offer.name}</p>` : ''}
            </div>
            
            <p>Agora você tem acesso ao sistema completo de gestão para confeitarias, onde poderá:</p>
            
            <ul>
              <li>📋 Gerenciar pedidos e orçamentos</li>
              <li>👥 Cadastrar e organizar clientes</li>
              <li>🧁 Controlar produtos e estoque</li>
              <li>💰 Acompanhar financeiro e relatórios</li>
              <li>📱 Criar catálogos online</li>
            </ul>
            
            <div class="credentials">
              <h3>🔐 Seus Dados de Acesso:</h3>
              <p><strong>E-mail:</strong> ${customer.email}</p>
              <p><strong>Senha:</strong> ${temporaryPassword}</p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Por segurança, recomendamos que você altere sua senha após o primeiro login.
            </div>
            
            <div style="text-align: center;">
              <a href="https://www.confeitariapro.com.br/login" class="button">
                🚀 Fazer Login Agora
              </a>
            </div>
            
            <h3>📚 Próximos Passos:</h3>
            <ol>
              <li>Faça login com os dados acima</li>
              <li>Configure os dados da sua confeitaria</li>
              <li>Cadastre seus produtos</li>
              <li>Comece a gerenciar seus pedidos!</li>
            </ol>
            
            <p>Se tiver alguma dúvida, nossa equipe de suporte está pronta para ajudar.</p>
            
            <p>Bem-vindo à família Confeitaria Pro! 🎉</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Confeitaria Pro - Sistema de Gestão Completo</p>
            <p>Este e-mail foi enviado automaticamente. Não responda a este e-mail.</p>
          </div>
        </body>
        </html>
        `

        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Confeitaria Pro <noreply@confeitariapro.com.br>',
            to: [customer.email],
            subject: '🧁 Bem-vindo ao Confeitaria Pro - Sua assinatura está ativa!',
            html: emailHtml,
          }),
        })

        if (emailResponse.ok) {
          const emailResult = await emailResponse.json()
          console.log('✅ E-mail enviado:', emailResult.id)
        } else {
          const emailError = await emailResponse.text()
          console.error('❌ Erro ao enviar e-mail:', emailError)
        }
      } catch (emailError) {
        console.error('❌ Erro no envio do e-mail:', emailError)
      }
    } else {
      console.log('⚠️ RESEND_API_KEY não configurada')
    }

    const response = {
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser.user!.id,
        email: customer.email,
        name: customer.name
      },
      subscription: {
        plano,
        data_pagamento: dataPagamento.toISOString(),
        vencimento: vencimento.toISOString()
      },
      credentials: {
        email: customer.email,
        password: temporaryPassword,
        login_url: 'https://www.confeitariapro.com.br/login'
      },
      email_sent: !!resendApiKey
    }

    console.log('🎉 Processamento concluído')

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Erro:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Função para determinar o tipo de plano baseado na oferta
function determinarPlano(offerName?: string): string {
  if (!offerName) return 'Mensal'
  
  const offerLower = offerName.toLowerCase()
  
  if (offerLower.includes('anual') || offerLower.includes('ano') || offerLower.includes('yearly')) {
    return 'Anual'
  }
  
  if (offerLower.includes('mensal') || offerLower.includes('mês') || offerLower.includes('monthly')) {
    return 'Mensal'
  }
  
  // Default para mensal se não conseguir determinar
  return 'Mensal'
}

// Função para calcular a data de vencimento
function calcularVencimento(dataPagamento: Date, plano: string): Date {
  const vencimento = new Date(dataPagamento)
  
  if (plano === 'Anual') {
    vencimento.setDate(vencimento.getDate() + 365)
  } else {
    vencimento.setDate(vencimento.getDate() + 30)
  }
  
  return vencimento
}