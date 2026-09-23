import { serverSupabaseServiceRole, serverSupabaseClient } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/**
 * Returns a Supabase client with admin (service role) privileges to bypass RLS
 * for server-side catalog aggregation, syllabus display, and stats.
 */
export function getAdminSupabaseClient(event?: H3Event) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL

  if (serviceKey && supabaseUrl) {
    return createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  }

  if (event) {
    try {
      return serverSupabaseServiceRole(event)
    } catch {
      // Fallback to regular server client if service role is unavailable
    }
  }

  throw new Error('Supabase Admin Client could not be initialized: missing service role key or URL')
}
