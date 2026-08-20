export const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token' }

export function optionsResponse() { return new Response('ok', { headers: corsHeaders }) }
