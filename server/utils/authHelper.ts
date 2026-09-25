import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

/**
 * Robustly extracts and verifies the authenticated user ID from:
 * 1. serverSupabaseUser (session cookies)
 * 2. Authorization: Bearer <token> header via client.auth.getUser()
 * 3. Verified fallbackId checked against profiles table
 */
export async function getAuthenticatedUserId(event: H3Event, fallbackId?: string | null): Promise<string | null> {
  const client = getAdminSupabaseClient(event)

  // 1. Try serverSupabaseUser (reads JWT from cookies)
  try {
    const user: any = await serverSupabaseUser(event)
    const id = user?.id || user?.sub
    if (id) return id
  } catch (e) {
    // Ignore cookie read failure
  }

  // 2. Try Authorization: Bearer <token>
  const authHeader = getHeader(event, 'Authorization') || getHeader(event, 'authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()
    if (token) {
      try {
        const { data } = await client.auth.getUser(token)
        if (data?.user?.id) {
          return data.user.id
        }
      } catch (e) {
        // Token verification failure
      }
    }
  }

  // 3. Fallback to passed user_id if verified against profiles
  if (fallbackId && typeof fallbackId === 'string' && fallbackId.length > 10) {
    const { data: profile } = await client
      .from('profiles')
      .select('id')
      .eq('id', fallbackId)
      .maybeSingle()
    if (profile?.id) {
      return profile.id
    }
  }

  return null
}
