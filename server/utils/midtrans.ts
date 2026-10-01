import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export function getMidtransConfig() {
  const config = useRuntimeConfig()
  const isProduction = config.midtransIsProduction === true
  return {
    serverKey: String(config.midtransServerKey || ''),
    clientKey: String(config.midtransClientKey || ''),
    isProduction,
    snapApi: isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    statusApi: isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2',
    snapJs: isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js',
  }
}

export function midtransAuthHeader(serverKey: string) {
  return 'Basic ' + Buffer.from(`${serverKey}:`).toString('base64')
}

export function assertMidtransConfigured() {
  const config = getMidtransConfig()
  if (!config.serverKey || !config.clientKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Kunci Midtrans Sandbox belum diisi di pengaturan server.',
    })
  }
  return config
}

export function isValidMidtransSignature(body: Record<string, any>, serverKey: string) {
  const expected = createHash('sha512')
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
    .digest('hex')
  return expected === body.signature_key
}

function isPaidStatus(body: Record<string, any>) {
  if (body.transaction_status === 'settlement') return true
  return body.transaction_status === 'capture' && body.fraud_status === 'accept'
}

export async function applyMidtransPayment(client: SupabaseClient, body: Record<string, any>) {
  const orderNumber = String(body.order_id || '')
  const { data: order } = await client
    .from('orders')
    .select('id, user_id, status, final_amount, payment_method')
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (!order) return { found: false, paid: false }

  const expectedAmount = Math.round(Number(order.final_amount))
  const paidAmount = Math.round(Number(body.gross_amount))
  if (expectedAmount !== paidAmount) {
    return { found: true, paid: false, reason: 'amount_mismatch' }
  }

  if (isPaidStatus(body)) {
    if (order.status !== 'paid') {
      const gatewayRef = String(body.transaction_id || '').slice(0, 100)
      await client
        .from('orders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: String(body.payment_type || 'midtrans').slice(0, 50),
          payment_gateway_ref: gatewayRef || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      const { data: items } = await client
        .from('order_items')
        .select('course_id')
        .eq('order_id', order.id)

      for (const item of items || []) {
        await client.from('enrollments').upsert({
          user_id: order.user_id,
          course_id: item.course_id,
          order_id: order.id,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_id' })
      }

      await client
        .from('affiliate_commissions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('order_id', order.id)
        .eq('status', 'pending')
    }

    return { found: true, paid: true }
  }

  const isCancelled = ['expire', 'cancel', 'deny'].includes(body.transaction_status)
  if (isCancelled && order.status === 'pending' && order.payment_method !== 'bank_transfer') {
    await client
      .from('orders')
      .update({
        status: body.transaction_status === 'deny' ? 'failed' : 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
  }

  return { found: true, paid: false }
}

export async function createSnapTransaction(options: {
  orderNumber: string
  grossAmount: number
  courseTitle: string
  customerName: string
  customerEmail: string
  customerPhone?: string | null
  finishUrl: string
  enabledPayments?: string[]
}) {
  const config = assertMidtransConfigured()
  const channels = options.enabledPayments?.length ? options.enabledPayments : ['other_qris']
  const response = await fetch(config.snapApi, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: midtransAuthHeader(config.serverKey),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: options.orderNumber,
        gross_amount: options.grossAmount,
      },
      item_details: [
        {
          id: options.orderNumber,
          price: options.grossAmount,
          quantity: 1,
          name: options.courseTitle.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: options.customerName.slice(0, 50),
        email: options.customerEmail,
        phone: options.customerPhone || undefined,
      },
      enabled_payments: channels,
      callbacks: {
        finish: options.finishUrl,
      },
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.token) {
    const message = payload.error_messages?.join(', ') || payload.status_message || 'Midtrans menolak pembuatan pembayaran.'
    throw createError({ statusCode: 502, statusMessage: message })
  }

  return {
    token: payload.token as string,
    redirectUrl: payload.redirect_url as string,
    clientKey: config.clientKey,
    snapJs: config.snapJs,
    isProduction: config.isProduction,
  }
}

export async function fetchMidtransStatus(orderNumber: string) {
  const config = assertMidtransConfigured()
  const response = await fetch(`${config.statusApi}/${encodeURIComponent(orderNumber)}/status`, {
    headers: {
      Accept: 'application/json',
      Authorization: midtransAuthHeader(config.serverKey),
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return null
  if (!isValidMidtransSignature(payload, config.serverKey)) return null
  return payload as Record<string, any>
}
