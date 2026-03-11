import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('🚀 Cakto Webhook - Evento:', body.event);

    if (body.event !== "purchase_approved" && body.event !== "payment.confirmed") {
      return new Response("Evento ignorado", { status: 200, headers: corsHeaders });
    }

    const { name: nome, email, phone: telefone } = body.data?.customer ?? {};
    const plano = body.data?.offer?.name ?? "Desconhecido";
    const pagoEm = body.data?.paidAt ?? new Date().toISOString();
    const produtoNome = body.data?.product?.name ?? "";

    if (!email || !nome) {
      return new Response("Dados incompletos", { status: 400, headers: corsHeaders });
    }

    // Calcular vencimento conforme sua lógica original
    let vencimento = null;
    if (pagoEm) {
      const pagoDate = new Date(pagoEm);
      vencimento = new Date(plano.includes("Anual")
        ? pagoDate.setDate(pagoDate.getDate() + 365)
        : pagoDate.setDate(pagoDate.getDate() + 30)).toISOString();
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Verifica se já existe usuário (usando maybeSingle para evitar erro se não achar)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let userId = profile?.id;

    if (!userId) {
      // Se não existe, cria novo usuário
      const senhaGerada = crypto.randomUUID().slice(0, 10);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: senhaGerada,
        email_confirm: true,
        user_metadata: {
          nome,
          origem: "cakto",
          plano,
          data_pagamento: pagoEm,
          vencimento,
          phone: telefone || null,
          produto: produtoNome,
          oferta: plano
        }
      });

      if (createError || !newUser?.user?.id) {
        console.error("Erro ao criar usuário:", createError);
        return new Response("Erro ao criar usuário", { status: 500, headers: corsHeaders });
      }

      userId = newUser.user.id;

      // Sincronizar tabelas complementares (essencial para o Admin)
      try {
        await supabase.from('profiles').insert({
          id: userId,
          full_name: nome,
          email: email,
          phone: telefone || null,
          created_at: new Date().toISOString()
        });

        await supabase.from('bakery_settings').insert({
          id: userId,
          bakery_name: `Loja de ${nome.split(' ')[0]}`,
          email: email,
          phone: telefone || null,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.error("Erro ao criar registros complementares (opcional):", e);
      }

      // Enviar e-mail de boas-vindas (Chave fixa como solicitado)
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h1 style="color: #615999; text-align: center;">🧁 Bem-vindo(a) ao Cataloguei!</h1>
          <p>Olá <strong>${nome}</strong>, sua conta foi criada com sucesso através da Cakto!</p>
          <div style="background: #f9f7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>E-mail:</strong> ${email}</p>
            <p><strong>Senha:</strong> ${senhaGerada}</p>
            <p><strong>Plano:</strong> ${plano}</p>
          </div>
          <p style="text-align: center;">
            <a href="https://app.catalogueii.com.br/login" style="background: #615999; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Fazer Login Agora</a>
          </p>
        </div>
      `;

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
          html: emailHtml
        })
      });
    } else {
      // Atualizar usuário existente
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          nome,
          plano,
          data_pagamento: pagoEm,
          vencimento,
          phone: telefone || null,
          produto: produtoNome,
          oferta: plano,
          updated_at: new Date().toISOString()
        }
      });

      // Atualizar telefone no perfil para o Admin ver
      await supabase.from('profiles')
        .update({ phone: telefone || null, updated_at: new Date().toISOString() })
        .eq('id', userId);
    }

    // Inserir/Atualizar assinatura
    const { error: assinaturaError } = await supabase.from("assinaturas").upsert({
      user_id: userId,
      email,
      nome,
      plano,
      data_pagamento: pagoEm,
      vencimento,
      produto: produtoNome,
      oferta: plano,
      origem: "cakto"
    }, { onConflict: "user_id" });

    if (assinaturaError) {
      console.error("Erro ao salvar assinatura:", assinaturaError);
      return new Response("Erro ao salvar assinatura", { status: 500, headers: corsHeaders });
    }

    return new Response("Processado com sucesso!", { status: 200, headers: corsHeaders });

  } catch (e) {
    console.error("Erro geral:", e);
    return new Response("Erro interno", { status: 500, headers: corsHeaders });
  }
});
