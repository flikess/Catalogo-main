import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autorização necessário' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user || user.user_metadata?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Acesso negado: apenas super admins' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { action, data } = await req.json();

    switch (action) {
      case 'list':
        return await listUsers(supabase);
      case 'create':
        return await createUser(supabase, data);
      case 'update':
        return await updateUser(supabase, data);
      case 'delete':
        return await deleteUser(supabase, data);
      default:
        return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Erro interno do servidor',
      details: error.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function listUsers(supabase) {
  try {
    // 1. Buscar Perfis
    const { data: profiles, error: pError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, created_at')
      .order('created_at', { ascending: false });

    if (pError) throw pError;

    // 2. Buscar Assinaturas
    const { data: assinaturas, error: aError } = await supabase
      .from('assinaturas')
      .select('user_id, plano, nome, data_pagamento, vencimento');

    if (aError) console.error('Aviso: Erro ao buscar assinaturas:', aError);

    // 3. Combinar dados (Garantindo que o nome apareça mesmo se o perfil estiver incompleto)
    const combined = profiles.map(p => {
      const a = assinaturas?.find(as => as.user_id === p.id);
      const vencimento = a?.vencimento ? new Date(a.vencimento) : null;
      const hoje = new Date();

      return {
        ...p,
        full_name: p.full_name || a?.nome || 'Sem nome', // Se não tem no perfil, busca na assinatura
        plano: a?.plano || '',
        data_pagamento: a?.data_pagamento || '',
        vencimento: a?.vencimento || '',
        status: (vencimento && vencimento >= hoje) ? 'ativo' : 'inativo'
      };
    });

    return new Response(JSON.stringify(combined), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao listar usuários', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function createUser(supabase, userData) {
  try {
    const password = userData.password || generatePassword();
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone, // Suporte ao WhatsApp
        plano: userData.plano,
        data_pagamento: userData.data_pagamento,
        vencimento: userData.vencimento,
        role: 'user',
        created_via: 'admin_panel'
      }
    });

    if (authError) throw authError;
    const userId = newUser.user.id;

    // Sincronizar Tabelas
    await Promise.all([
      supabase.from('profiles').upsert({
        id: userId,
        full_name: userData.full_name,
        email: userData.email,
        phone: userData.phone,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }),

      supabase.from('assinaturas').upsert({
        user_id: userId,
        email: userData.email,
        nome: userData.full_name,
        plano: userData.plano,
        data_pagamento: userData.data_pagamento,
        vencimento: userData.vencimento,
        produto: `Cataloguei Pro - ${userData.plano}`,
        oferta: 'Manual (Admin)'
      }, { onConflict: 'user_id' }),

      supabase.from('bakery_settings').upsert({
        id: userId,
        bakery_name: userData.business_name || `Loja de ${userData.full_name.split(' ')[0]}`,
        email: userData.email,
        phone: userData.phone,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
    ]);

    return new Response(JSON.stringify({ success: true, message: 'Usuário criado com sucesso' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao criar usuário', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function updateUser(supabase, { userId, userData }) {
  try {
    const authUpdateData: any = {
      user_metadata: {
        full_name: userData.full_name,
        phone: userData.phone,
        plano: userData.plano,
        data_pagamento: userData.data_pagamento,
        vencimento: userData.vencimento
      }
    };

    if (userData.password && userData.password.trim() !== '') {
      authUpdateData.password = userData.password;
    }

    await supabase.auth.admin.updateUserById(userId, authUpdateData);

    await Promise.all([
      supabase.from('profiles').update({
        full_name: userData.full_name,
        phone: userData.phone,
        updated_at: new Date().toISOString()
      }).eq('id', userId),

      supabase.from('assinaturas').upsert({
        user_id: userId,
        email: userData.email,
        nome: userData.full_name,
        plano: userData.plano,
        data_pagamento: userData.data_pagamento,
        vencimento: userData.vencimento
      }, { onConflict: 'user_id' })
    ]);

    return new Response(JSON.stringify({ success: true, message: 'Usuário atualizado com sucesso' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao atualizar usuário', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function deleteUser(supabase, { userId }) {
  try {
    await Promise.all([
      supabase.from('bakery_settings').delete().eq('id', userId),
      supabase.from('assinaturas').delete().eq('user_id', userId),
      supabase.from('profiles').delete().eq('id', userId)
    ]);
    await supabase.auth.admin.deleteUser(userId);
    return new Response(JSON.stringify({ success: true, message: 'Usuário deletado' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Erro ao deletar usuário', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  return Array.from({ length: 14 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
}