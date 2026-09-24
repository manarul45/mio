import { serverSupabaseUser } from '#supabase/server'
import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { logAuditAction } from '~/server/utils/auditLogger'

const knownTables = [
  'profiles',
  'categories',
  'courses',
  'course_sections',
  'lessons',
  'quizzes',
  'quiz_questions',
  'quiz_options',
  'orders',
  'order_items',
  'enrollments',
  'lesson_progress',
  'quiz_attempts',
  'certificates',
  'vouchers',
  'landing_pages',
  'settings',
  'whatsapp_templates',
  'affiliate_commissions',
  'affiliate_withdrawals',
  'course_reviews',
  'lesson_discussions',
  'lesson_discussion_replies',
  'audit_logs',
]

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const query = getQuery(event)
  const format = (query.format as string) === 'sql' ? 'sql' : 'json'
  const client = getAdminSupabaseClient(event)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `mio-learning-academy-db-backup-${timestamp}.${format}`

  const dumpData: Record<string, any[]> = {}
  let totalRows = 0

  for (const table of knownTables) {
    try {
      const { data, error } = await client.from(table).select('*')
      if (!error && data) {
        dumpData[table] = data
        totalRows += data.length
      } else {
        dumpData[table] = []
      }
    } catch {
      dumpData[table] = []
    }
  }

  // Audit log
  await logAuditAction({
    event,
    userId: user.id,
    action: 'DATABASE_EXPORT_FULL',
    entityType: 'database',
    entityId: 'full_backup',
    newValues: {
      format,
      filename,
      total_tables: knownTables.length,
      total_rows: totalRows,
      exported_at: new Date().toISOString(),
    },
  })

  if (format === 'sql') {
    let sqlDump = `-- ========================================================\n`
    sqlDump += `-- MIO Learning Academy - Database Backup & Export\n`
    sqlDump += `-- Engine        : Supabase PostgreSQL\n`
    sqlDump += `-- Exported At   : ${new Date().toISOString()}\n`
    sqlDump += `-- Total Tables  : ${knownTables.length}\n`
    sqlDump += `-- Total Rows    : ${totalRows}\n`
    sqlDump += `-- ========================================================\n\n`

    for (const [table, rows] of Object.entries(dumpData)) {
      if (rows.length === 0) continue
      sqlDump += `-- Table: ${table} (${rows.length} rows)\n`
      for (const row of rows) {
        const columns = Object.keys(row).map(c => `"${c}"`).join(', ')
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'number' || typeof val === 'boolean') return val
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`
          return `'${String(val).replace(/'/g, "''")}'`
        }).join(', ')
        sqlDump += `INSERT INTO "${table}" (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`
      }
      sqlDump += `\n`
    }

    setResponseHeaders(event, {
      'Content-Type': 'application/sql; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    })
    return sqlDump
  }

  // JSON format
  setResponseHeaders(event, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  })

  return {
    meta: {
      platform: 'MIO Learning Academy',
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      total_tables: knownTables.length,
      total_rows: totalRows,
    },
    tables: dumpData,
  }
})
