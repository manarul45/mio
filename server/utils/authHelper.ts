import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

async function userIdFromBearer(event: H3Event, client: ReturnType<typeof getAdminSupabaseClient>): Promise<string | null> {
  const authHeader = getHeader(event, 'Authorization') || getHeader(event, 'authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.substring(7).trim()
  if (!token) return null

  try {
    const { data } = await client.auth.getUser(token)
    return data?.user?.id || null
  } catch {
    return null
  }
}

export async function getAuthenticatedUserId(event: H3Event, fallbackId?: string | null): Promise<string | null> {
  const client = getAdminSupabaseClient(event)

  const bearerId = await userIdFromBearer(event, client)
  if (bearerId) return bearerId

  try {
    const user: any = await serverSupabaseUser(event)
    const id = user?.id || user?.sub
    if (id) return id
  } catch {
    // cookie gagal dibaca
  }

  if (fallbackId && typeof fallbackId === 'string' && fallbackId.length > 10) {
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .eq('id', fallbackId)
      .maybeSingle()
    if (profile?.id) return profile.id
  }

  return null
}

function isAdminEmail(email: string | null | undefined) {
  const normalized = (email || '').toLowerCase().trim()
  return normalized === 'admin@mioacademy.com' || normalized.startsWith('admin@')
}

export async function requireAdmin(event: H3Event, fallbackId?: string | null): Promise<{ userId: string }> {
  let sessionUser: any = null
  try {
    sessionUser = await serverSupabaseUser(event)
  } catch {
    sessionUser = null
  }

  const userId = await getAuthenticatedUserId(event, fallbackId)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const client = getAdminSupabaseClient(event)
  const { data: profile } = await client
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .maybeSingle()

  const role = String(profile?.role || '').toUpperCase()
  const sessionId = sessionUser?.id || sessionUser?.sub
  const sameSession = !sessionId || sessionId === userId
  const metaRole = sameSession
    ? String(sessionUser?.user_metadata?.role || sessionUser?.app_metadata?.role || '').toUpperCase()
    : ''
  const autoAdmin = isAdminEmail(profile?.email) || (sameSession && isAdminEmail(sessionUser?.email))
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || metaRole === 'ADMIN' || metaRole === 'SUPER_ADMIN' || autoAdmin

  if (!isAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Akses khusus administrator.' })
  }

  if (profile && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    await client.from('profiles').update({ role: 'ADMIN' }).eq('id', userId)
  }

  return { userId }
}
