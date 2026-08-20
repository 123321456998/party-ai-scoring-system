import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function adminClient() { return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!) }
export function userClient(req: Request) { return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }) }
export async function currentAuthUid(req: Request) { const client = userClient(req); const { data, error } = await client.auth.getUser(); if (error || !data.user || !data.user.is_anonymous) throw new Error('匿名会话无效。'); return data.user.id }
export async function sha256(value: string) { const bytes = new TextEncoder().encode(value); const hash = await crypto.subtle.digest('SHA-256', bytes); return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('') }
