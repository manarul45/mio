import { getAdminSupabaseClient } from '~/server/utils/supabaseAdmin'
import { applyMidtransPayment, getMidtransConfig, isValidMidtransSignature } from '~/server/utils/midtrans'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const config = getMidtransConfig()
  if (!config.serverKey) {
    throw createError({ statusCode: 500, statusMessage: 'Kunci Midtrans belum diisi.' })
  }
  if (!body?.order_id || !isValidMidtransSignature(body, config.serverKey)) {
    throw createError({ statusCode: 401, statusMessage: 'Tanda tangan pembayaran tidak sah.' })
  }

  const client = getAdminSupabaseClient(event)
  const result = await applyMidtransPayment(client, body)
  return { ok: true, paid: result.paid }
})
