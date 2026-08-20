import { adminClient, sha256 } from './auth.ts'

export async function requireAdmin(req: Request) {
  const token = req.headers.get('x-admin-token')
  if (!token) throw new Error('管理员会话无效。')
  const db = adminClient(); const hash = await sha256(token)
  const { data } = await db.from('admin_sessions').select('id').eq('token_hash', hash).gt('expires_at', new Date().toISOString()).maybeSingle()
  if (!data) throw new Error('管理员会话已过期。')
  return db
}

export async function issueAdminToken() {
  const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`
  const db = adminClient(); const hash = await sha256(token)
  const { error } = await db.from('admin_sessions').insert({ token_hash: hash, expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() })
  if (error) throw error
  return token
}
