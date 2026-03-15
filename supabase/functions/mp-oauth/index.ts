import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code, redirect_uri } = await req.json()

        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Sem token de autorização')

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verificar quem é o usuário que está chamando
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
        if (userError || !user) throw new Error('Usuário não autenticado')

        // Credenciais do seu APP no Mercado Pago
        const MP_CLIENT_ID = Deno.env.get('MP_CLIENT_ID')
        const MP_CLIENT_SECRET = Deno.env.get('MP_CLIENT_SECRET')

        if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
            throw new Error('Chaves do Mercado Pago não configuradas no servidor')
        }

        // Trocar o CODE pelo ACCESS_TOKEN no Mercado Pago
        const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'accept': 'application/json'
            },
            body: new URLSearchParams({
                client_id: MP_CLIENT_ID,
                client_secret: MP_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirect_uri
            })
        })

        const tokenData = await tokenResponse.json()

        if (!tokenResponse.ok) {
            console.error('Erro MP:', tokenData)
            throw new Error(tokenData.message || 'Erro ao autorizar no Mercado Pago')
        }

        // Recuperar a Public Key via Access Token (opcional, só se quiser salvar)
        // ou salvar direto as credenciais
        const access_token = tokenData.access_token
        const public_key = tokenData.public_key
        const refresh_token = tokenData.refresh_token
        const mp_user_id = tokenData.user_id

        // Salvar no Supabase
        const { error: dbError } = await supabaseClient
            .from('payment_configs')
            .upsert({
                user_id: user.id,
                gateway_name: 'mercadopago',
                access_token: access_token,
                public_key: public_key,
                refresh_token: refresh_token,
                mp_user_id: mp_user_id?.toString(),
                status: true, // Já ativa o pagamento automaticamente
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, gateway_name' })

        if (dbError) throw dbError

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
