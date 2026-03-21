import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { bakery_id, external_reference } = await req.json()

    if (!bakery_id || !external_reference) {
      throw new Error("Faltam dados: bakery_id ou external_reference")
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Chaves do servidor ausentes.")
    }
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Pegar o token do MP
    const { data: payConfig, error: payError } = await supabaseClient
      .from('payment_configs')
      .select('access_token')
      .eq('user_id', bakery_id)
      .eq('gateway_name', 'mercadopago')
      .eq('status', true)
      .single()

    if (payError || !payConfig || !payConfig.access_token) {
      throw new Error("Lojista não tem Mercado Pago ativo.")
    }

    const access_token = payConfig.access_token

    // Procurar pagamentos no MP por external_reference
    const mpUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${external_reference}`

    const response = await fetch(mpUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Erro API MP: ${JSON.stringify(data)}`)
    }

    // Verifica resultados se algum pagamento está 'approved'
    const results = data.results || []
    const approvedPayment = results.find((p: any) => p.status === 'approved')

    if (approvedPayment) {
      return new Response(
        JSON.stringify({ success: true, approved: true, payment_id: approvedPayment.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Se estiver cancelado/rejeitado e for o único, podemos retornar failed, senão pending
    const rejectedPayment = results.find((p: any) => p.status === 'rejected' || p.status === 'cancelled')

    if (results.length > 0 && rejectedPayment && !results.find((p: any) => p.status === 'pending' || p.status === 'in_process')) {
      return new Response(
        JSON.stringify({ success: true, approved: false, rejected: true, status: rejectedPayment.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Se não achou nenhum ou então estão todos pendentes:
    return new Response(
      JSON.stringify({ success: true, approved: false, status: 'pending' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
