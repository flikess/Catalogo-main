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
    console.log('🔧 Admin Users Function - Iniciando...')
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Obter token de autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar se o usuário é super admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      console.error('❌ Erro ao verificar usuário:', userError)
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const userRole = user.user_metadata?.role
    if (userRole !== 'super_admin') {
      console.error('❌ Usuário não é super admin:', user.email, 'Role:', userRole)
      return new Response(
        JSON.stringify({ error: 'Acesso negado: apenas super admins' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Super admin verificado:', user.email)

    const { action, data } = await req.json()
    console.log('📋 Ação solicitada:', action)

    switch (action) {
      case 'create':
        return await createUser(supabase, data)
      case 'update':
        return await updateUser(supabase, data)
      case 'delete':
        return await deleteUser(supabase, data)
      default:
        return new Response(
          JSON.stringify({ error: 'Ação não reconhecida' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    console.error('💥 Erro:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function createUser(supabase: any, userData: any) {
  try {
    console.log('➕ Criando usuário:', userData.email)

    // Gerar senha se não fornecida
    if (!userData.password) {
      userData.password = generatePassword()
    }

    // Criar usuário no Auth
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        plano: userData.plano,
        data_pagamento: userData.data_pagamento,
        vencimento: userData.vencimento,
        created_via: 'admin_panel'
      }
    })

    if (authError) {
      console.error('❌ Erro ao criar usuário no Auth:', authError)
      throw authError
    }

    console.log('✅ Usuário criado no Auth:', newUser.user?.id)

    // Criar perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user!.id,
        full_name: userData.full_name,
        email: userData.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('❌ Erro ao criar perfil:', profileError)
      throw profileError
    }
    console.log('✅ Perfil criado')

    // Criar assinatura
    const { error: assinaturaError } = await supabase
      .from('assinaturas')
      .insert({
        user_id: newUser.user!.id,
        email: userData.email,
        nome: userData.full_name,
        plano: userData.plano,
        data_pagamento: userData.data_pagamento,
        vencimento: userData.vencimento,
        produto: `Confeitaria Pro - Plano ${userData.plano}`,
        oferta: 'Criado via Admin'
      })

    if (assinaturaError) {
      console.error('❌ Erro ao criar assinatura:', assinaturaError)
      throw assinaturaError
    }
    console.log('✅ Assinatura criada')

    // Criar configurações da confeitaria
    const { error: settingsError } = await supabase
      .from('bakery_settings')
      .insert({
        id: newUser.user!.id,
        bakery_name: `Confeitaria de ${userData.full_name.split(' ')[0]}`,
        email: userData.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (settingsError) {
      console.error('⚠️ Erro ao criar configurações (não crítico):', settingsError)
    } else {
      console.log('✅ Configurações criadas')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário criado com sucesso',
        user: {
          id: newUser.user!.id,
          email: userData.email,
          full_name: userData.full_name
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Erro ao criar usuário:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao criar usuário', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function updateUser(supabase: any, { userId, userData }: any) {
  try {
    console.log('✏️ Atualizando usuário:', userId)
    console.log('📋 Dados recebidos:', userData)

    // Validar se email está presente
    if (!userData.email) {
      throw new Error('E-mail é obrigatório para atualização')
    }

    // Buscar dados atuais do usuário para garantir que temos todos os campos
    const { data: currentProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (profileFetchError) {
      console.error('❌ Erro ao buscar perfil atual:', profileFetchError)
      throw profileFetchError
    }

    console.log('📋 Dados atuais do perfil:', currentProfile)

    // Usar dados atuais como fallback
    const emailToUse = userData.email || currentProfile.email
    const fullNameToUse = userData.full_name || currentProfile.full_name

    console.log('📧 E-mail a ser usado:', emailToUse)
    console.log('👤 Nome a ser usado:', fullNameToUse)

    // Atualizar e-mail no Auth se fornecido e diferente do atual
    if (userData.email && userData.email !== currentProfile.email) {
      console.log('📧 Atualizando e-mail no Auth...')
      const { error: emailError } = await supabase.auth.admin.updateUserById(userId, {
        email: userData.email,
        email_confirm: true
      })

      if (emailError) {
        console.error('❌ Erro ao atualizar e-mail:', emailError)
        throw emailError
      }
      console.log('✅ E-mail atualizado no Auth')
    }

    // Atualizar user_metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: fullNameToUse,
        plano: userData.plano,
        data_pagamento: userData.data_pagamento,
        vencimento: userData.vencimento,
      }
    })

    if (authError) {
      console.error('❌ Erro ao atualizar user metadata:', authError)
      throw authError
    }
    console.log('✅ User metadata atualizado')

    // Atualizar perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullNameToUse,
        email: emailToUse,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('❌ Erro ao atualizar perfil:', profileError)
      throw profileError
    }
    console.log('✅ Perfil atualizado')

    // Atualizar assinatura - garantir que todos os campos obrigatórios estejam presentes
    const assinaturaData = {
      user_id: userId,
      email: emailToUse, // Garantir que email não seja null
      nome: fullNameToUse, // Garantir que nome não seja null
      plano: userData.plano || 'Mensal',
      data_pagamento: userData.data_pagamento,
      vencimento: userData.vencimento,
      produto: `Confeitaria Pro - Plano ${userData.plano || 'Mensal'}`,
      oferta: 'Atualizado via Admin'
    }

    console.log('💳 Dados da assinatura a serem salvos:', assinaturaData)

    const { error: assinaturaError } = await supabase
      .from('assinaturas')
      .upsert(assinaturaData)

    if (assinaturaError) {
      console.error('❌ Erro ao atualizar assinatura:', assinaturaError)
      throw assinaturaError
    }
    console.log('✅ Assinatura atualizada')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário atualizado com sucesso' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Erro ao atualizar usuário:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao atualizar usuário', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

async function deleteUser(supabase: any, { userId }: any) {
  try {
    console.log('🗑️ Deletando usuário:', userId)

    // Deletar usuário via Admin API
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('❌ Erro ao deletar usuário:', authError)
      throw authError
    }

    console.log('✅ Usuário deletado')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário deletado com sucesso' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error('❌ Erro ao deletar usuário:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao deletar usuário', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}