import { issueAdminToken } from '../_shared/admin.ts'
import { corsHeaders, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse()
  try { const { pin } = await req.json(); if (pin !== Deno.env.get('ADMIN_PIN')) throw new Error('管理员口令不正确。'); const token = await issueAdminToken(); return new Response(JSON.stringify({ token }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : '验证失败。' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) }
})
