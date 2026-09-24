import type { H3Event } from 'h3'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'

export interface AuditLogPayload {
  event?: H3Event
  userId?: string | null
  action: string
  entityType: string
  entityId: string | number
  oldValues?: any
  newValues?: any
}

/**
 * Centrally records an administrative or critical system action into public.audit_logs.
 */
export async function logAuditAction(payload: AuditLogPayload) {
  try {
    const client = getAdminSupabaseClient(payload.event)

    let ipAddress: string | null = null
    let userAgent: string | null = null

    if (payload.event) {
      ipAddress = getRequestIP(payload.event, { xForwardedFor: true }) || null
      userAgent = getRequestHeader(payload.event, 'user-agent') || null
    }

    await client
      .from('audit_logs')
      .insert({
        user_id: payload.userId || null,
        action: payload.action,
        entity_type: payload.entityType,
        entity_id: String(payload.entityId),
        old_values: payload.oldValues || null,
        new_values: payload.newValues || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      })
  } catch (err) {
    console.error('Failed to write audit log:', err)
  }
}
