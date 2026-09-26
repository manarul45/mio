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

async function resolveAuthUser(event: H3Event, client: ReturnType<typeof getAdminSupabaseClient>) {
  const authHeader = getHeader(event, 'Authorization') || getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token) {
      try {
        const { data } = await client.auth.getUser(token)
        if (data?.user) return data.user
      } catch {
        // Lanjut ke cookie sesi
      }
    }
  }

  try {
    return await serverSupabaseUser(event)
  } catch {
    return null
  }
}

function callerIsAdmin(authUser: any, profile: { role?: string | null; email?: string | null } | null) {
  const role = String(profile?.role || '').toUpperCase()
  const metaRole = String(authUser?.user_metadata?.role || authUser?.app_metadata?.role || '').toUpperCase()
  const autoAdmin = isAdminEmail(profile?.email) || isAdminEmail(authUser?.email)
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || metaRole === 'ADMIN' || metaRole === 'SUPER_ADMIN' || autoAdmin
}

async function syncAdminRole(
  client: ReturnType<typeof getAdminSupabaseClient>,
  userId: string,
  profile: { role?: string | null } | null,
) {
  const role = String(profile?.role || '').toUpperCase()
  if (profile && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    await client.from('profiles').update({ role: 'ADMIN' }).eq('id', userId)
  }
}

/**
 * Pastikan pemanggil adalah admin.
 * ID diambil dari cookie (id atau sub) atau token, sama seperti menu instruktur.
 * Email admin@ juga diakui, supaya sama dengan tampilan sidebar.
 */
export async function requireAdmin(event: H3Event, fallbackId?: string | null): Promise<{ userId: string }> {
  const client = getAdminSupabaseClient(event)
  const authUser = await resolveAuthUser(event, client)
  const userId = authUser?.id || authUser?.sub || await getAuthenticatedUserId(event, fallbackId)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .maybeSingle()

  if (!callerIsAdmin(authUser, profile)) {
    throw createError({ statusCode: 403, statusMessage: 'Akses khusus administrator.' })
  }

  await syncAdminRole(client, userId, profile)
  return { userId }
}

/**
 * Admin (sama seperti menu) atau pemilik kursus boleh mengubah isi kursus.
 * Penulisan memakai kunci server, jadi aturan tabel quizzes tidak menolak admin.
 */
export async function assertCanManageCourse(event: H3Event, courseId: string, fallbackId?: string | null) {
  const client = getAdminSupabaseClient(event)
  const authUser = await resolveAuthUser(event, client)
  const userId = authUser?.id || authUser?.sub || await getAuthenticatedUserId(event, fallbackId)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk.' })
  }

  const { data: course } = await client
    .from('courses')
    .select('id, instructor_id')
    .eq('id', courseId)
    .maybeSingle()

  if (!course) {
    throw createError({ statusCode: 404, statusMessage: 'Kursus tidak ditemukan' })
  }

  const { data: profile } = await client
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .maybeSingle()

  const isAdmin = callerIsAdmin(authUser, profile)
  if (!isAdmin && course.instructor_id !== userId) {
    throw createError({ statusCode: 403, statusMessage: 'Anda tidak memiliki hak akses untuk mengedit kursus ini' })
  }

  if (isAdmin) {
    await syncAdminRole(client, userId, profile)
  }

  return { client, userId }
}
