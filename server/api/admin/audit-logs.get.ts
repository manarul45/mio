import { requireAdmin } from '~/server/utils/authHelper'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export default defineEventHandler(async (event) => {
  const client = getAdminSupabaseClient(event)
await requireAdmin(event)

  const query = getQuery(event)
  const search = (query.search as string) || ''
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(10, Number(query.limit) || 25))
  const from = (page - 1) * limit
  const to = from + limit - 1

  let dbQuery = client
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      ip_address,
      user_agent,
      created_at,
      user:profiles!audit_logs_user_id_fkey(id, name, email, role)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search.trim()) {
    dbQuery = dbQuery.or(`action.ilike.%${search.trim()}%,entity_type.ilike.%${search.trim()}%`)
  }

  const { data: logs, count, error } = await dbQuery

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Gagal memuat log audit: ' + error.message })
  }

  return {
    logs: logs || [],
    total: count || 0,
    page,
    limit,
  }
})
