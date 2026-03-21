import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let origin = req.headers.get("origin") || req.headers.get("referer") || "https://app.catalogueii.com.br"
    // O Mercado Pago recusa links com http://localhost em muitas contas recentes.
    // Para fins de teste, se for localhost, forçamos o domínio real provisório.
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      origin = "https://app.catalogueii.com.br"
    }

    const { order_id, bakery_id, cart_items, total_amount, client_data, payment_method } = await req.json()

    if (!bakery_id || !order_id || !total_amount) {
      throw new Error("Faltam dados do pedido (bakery_id, order_id, total_amount)")
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("As variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY estão ausentes no servidor.")
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // 1. Buscar a configuração do Mercado Pago Específica desta padaria
    const { data: payConfig, error: payError } = await supabaseClient
      .from('payment_configs')
      .select('*')
      .eq('user_id', bakery_id)
      .eq('gateway_name', 'mercadopago')
      .eq('status', true)
      .single()

    if (payError || !payConfig || !payConfig.access_token) {
      throw new Error('Esta loja não tem o Mercado Pago configurado ou ativado no momento.')
    }

    const access_token = payConfig.access_token

    if (payment_method === 'pix') {
      const mpUrl = "https://api.mercadopago.com/v1/payments"
      const bodyData = {
        transaction_amount: Number(Number(total_amount).toFixed(2)),
        description: `Pedido ${order_id} - CATALOGUEI`,
        payment_method_id: "pix",
        payer: {
          email: "cliente@app.catalogueii.com.br",
          first_name: client_data.nome || "Cliente"
        },
        external_reference: order_id
      }

      const response = await fetch(mpUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'X-Idempotency-Key': order_id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("Erro MP Pix:", data)
        throw new Error(`Erro API MP Pix: ${JSON.stringify(data.message || data)}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'pix',
          payment_id: data.id,
          qr_code: data.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: data.point_of_interaction?.transaction_data?.ticket_url
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // 2. Chamar a API de Preferências do Mercado Pago usando o token DA LOJA para Cartão/Link
    const mpUrl = "https://api.mercadopago.com/checkout/preferences"

    const bodyData = {
      items: cart_items.map((item: any) => ({
        id: item.id || 'item',
        title: item.name,
        description: item.size || 'Unidade',
        quantity: item.quantity,
        currency_id: "BRL",
        unit_price: Number(item.price) // Precisa ser Number real
      })),
      payer: {
        name: client_data.nome,
      },
      back_urls: {
        success: `${origin}/catalogo/${bakery_id}`,
        failure: `${origin}/catalogo/${bakery_id}`,
        pending: `${origin}/catalogo/${bakery_id}`
      },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" } // Exclui boleto para padaria (demora muito)
        ],
        installments: 1 // sem parcelamento pra comida
      },
      statement_descriptor: "CATALOGUEI OLINE",
      external_reference: order_id
    }

    const response = await fetch(mpUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Erro MP Preferences:", data)
      throw new Error(`Erro API MP: ${JSON.stringify(data.message || data)}`)
    }

    // Retorna o init_point (link de pagamento pro cliente)
    return new Response(
      JSON.stringify({
        success: true,
        init_point: data.init_point, // Link normal
        sandbox_init_point: data.sandbox_init_point,
        preference_id: data.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    console.error("Catch Error:", error.message)
    // Sempre retorna 200 pro CORS e pro supabase-js ler o body normalmente
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
